#!/usr/bin/env python3
"""Sample this Windows PC and write stats.json for the Luna 26 dashboard.

Stdlib only (no psutil): hardware numbers come from PowerShell/CIM, the rest
from ping, the Ollama HTTP API and Hermes' cron execution log. Every probe is
best-effort - a failed probe becomes null, never a made-up number.
"""
from __future__ import annotations

import json
import os
import platform
import re
import sqlite3
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "stats.json"
HERMES = Path(os.environ.get("LOCALAPPDATA", "")) / "hermes"
BLUETTI_PY = Path(r"C:\Users\Bowon\AppData\Local\hermes\cache\scratch\blevenv\Scripts\bluetti-read.exe")
BLUETTI_MAC = "D7:35:3E:71:D7:DD"
BLUETTI_TYPE = "AC180P"
HISTORY_MAX = 288          # 10-minute samples -> 48 h

PS_SCRIPT = r"""
$os  = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
$d   = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$tz  = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1
[pscustomobject]@{
  ram_total_kb = [double]$os.TotalVisibleMemorySize
  ram_free_kb  = [double]$os.FreePhysicalMemory
  boot         = $os.LastBootUpTime.ToString('o')
  cpu_load     = $(if ($cpu) { [math]::Round((($cpu | Measure-Object -Property LoadPercentage -Average).Average), 1) } else { $null })
  cores        = $(if ($cpu) { ($cpu | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum } else { $null })
  disk_total   = [double]$d.Size
  disk_free    = [double]$d.FreeSpace
  temp_c       = $(if ($tz) { [math]::Round($tz.CurrentTemperature / 10 - 273.15, 1) } else { $null })
} | ConvertTo-Json -Compress
"""


def run(cmd: list[str], timeout: int = 60) -> str:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                           errors="replace")
        return (p.stdout or "") + (p.stderr or "")
    except Exception:
        return ""


def machine() -> dict:
    raw = run(["powershell", "-NoProfile", "-NonInteractive", "-Command", PS_SCRIPT])
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return {}


def internet() -> dict:
    out = run(["ping", "-n", "4", "-w", "1000", "1.1.1.1"], 20)
    loss = re.search(r"\((\d+)% loss\)", out)
    avg = re.search(r"Average = (\d+)ms", out)
    return {
        "loss_pct": int(loss.group(1)) if loss else None,
        "latency_ms": int(avg.group(1)) if avg else None,
        "target": "1.1.1.1",
    }


def ollama() -> dict:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/ps", timeout=2) as r:
            data = json.loads(r.read().decode())
        models = [m.get("name") or m.get("model") for m in data.get("models", [])]
        return {"running": True, "models": [m for m in models if m]}
    except Exception:
        return {"running": False, "models": []}


def bluetti() -> dict | None:
    if not BLUETTI_PY.exists():
        return None
    out = run([str(BLUETTI_PY), "-m", BLUETTI_MAC, "-t", BLUETTI_TYPE, "-e", "true"], 75)
    fields = {k: float(v) for k, v in re.findall(r"\b([A-Z_]{4,})\b\s*[:=]\s*(-?\d+(?:\.\d+)?)", out)}
    if "BATTERY_SOC" not in fields:
        return None
    return {
        "model": BLUETTI_TYPE,
        "soc": round(fields["BATTERY_SOC"]),
        "input_w": round(fields.get("AC_INPUT_POWER", 0) + fields.get("DC_INPUT_POWER", 0)),
        "output_w": round(fields.get("AC_OUTPUT_POWER", 0) + fields.get("DC_OUTPUT_POWER", 0)),
        "ac_on": bool(fields.get("CTRL_AC", 0)),
        "dc_on": bool(fields.get("CTRL_DC", 0)),
    }


def job_names() -> dict:
    """id -> (name, cron display) from Hermes' job definitions."""
    p = HERMES / "cron" / "jobs.json"
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return {j["id"]: (j.get("name") or j["id"],
                          (j.get("schedule") or {}).get("display") or "")
                for j in data.get("jobs", [])}
    except Exception:
        return {}


def jobs() -> list[dict]:
    names = job_names()
    db = HERMES / "cron" / "executions.db"
    if not db.exists():
        return []
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        rows = con.execute(
            "select job_id, status, started_at, finished_at from executions "
            "order by rowid desc limit 40"
        ).fetchall()
        con.close()
    except Exception:
        return []
    seen, out = set(), []
    for job_id, status, started, finished in rows:
        if job_id in seen:
            continue
        seen.add(job_id)
        dur = None
        try:
            if started and finished:
                dur = round((datetime.fromisoformat(finished) - datetime.fromisoformat(started)).total_seconds())
        except Exception:
            pass
        out.append({
            "name": names.get(job_id, (job_id[:10], ""))[0],
            "schedule": names.get(job_id, ("", ""))[1],
            "status": (status or "unknown").lower(),
            "last_run": started,
            "duration_s": dur,
        })
        if len(out) >= 6:
            break
    return out


def main() -> int:
    m = machine()
    now = datetime.now(timezone.utc)
    boot = None
    uptime_s = None
    if m.get("boot"):
        try:
            boot = datetime.fromisoformat(m["boot"].split("+")[0].split(".")[0])
            uptime_s = int((datetime.now() - boot).total_seconds())
        except Exception:
            pass

    ram_total = round(m.get("ram_total_kb", 0) / 1048576, 1)      # GB
    ram_used = round((m.get("ram_total_kb", 0) - m.get("ram_free_kb", 0)) / 1048576, 1)
    disk_total = round(m.get("disk_total", 0) / 1024**3)
    disk_free = round(m.get("disk_free", 0) / 1024**3)

    stats = {
        "generated": now.astimezone().isoformat(timespec="seconds"),
        "generated_utc": now.isoformat(timespec="seconds"),
        "host": platform.node(),
        "cpu": {
            "load": m.get("cpu_load"),
            "temp_c": m.get("temp_c"),
            "cores": int(m["cores"]) if m.get("cores") else None,
        },
        "ram": {
            "used_gb": ram_used,
            "total_gb": ram_total,
            "pct": round(ram_used / ram_total * 100, 1) if ram_total else None,
        },
        "disk": {
            "free_gb": disk_free,
            "total_gb": disk_total,
            "pct_free": round(disk_free / disk_total * 100, 1) if disk_total else None,
        },
        "boot": m.get("boot"),
        "uptime_s": uptime_s,
        "power": bluetti(),
        "ollama": ollama(),
        "net": internet(),
        "jobs": jobs(),
        "history": [],
    }

    # rolling history
    try:
        prev = json.loads(OUT.read_text(encoding="utf-8"))
        stats["history"] = prev.get("history", [])[-HISTORY_MAX:]
    except Exception:
        pass
    stats["history"].append({
        "t": stats["generated_utc"],
        "cpu": stats["cpu"]["load"],
        "ram": stats["ram"]["pct"],
        "lat": stats["net"]["latency_ms"],
    })
    stats["history"] = stats["history"][-HISTORY_MAX:]

    OUT.write_text(json.dumps(stats, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT} ({len(stats['history'])} history points)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
