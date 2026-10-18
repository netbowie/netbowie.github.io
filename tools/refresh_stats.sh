#!/usr/bin/env bash
# Refresh stats.json from this PC and publish it to GitHub Pages.
# Run by the Hermes cron job "stats-refresh" every 10 minutes.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:/c/Program Files/GitHub CLI"

python tools/collect_stats.py

git add stats.json
if git diff --cached --quiet; then
  echo "stats unchanged, nothing to push"
  exit 0
fi
git commit -q -m "stats: $(date -Iseconds)"
git push -q origin main
echo "pushed $(date -Iseconds)"
