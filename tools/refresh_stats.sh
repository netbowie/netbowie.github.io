#!/usr/bin/env bash
# Refresh stats.json from this PC and publish it to GitHub Pages.
# Run by the Hermes cron job "stats-refresh" every 10 minutes.
#
# To avoid ~144 commits a day, stats are folded into one rolling commit:
# if the previous commit is also a stats commit it gets amended.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:/c/Program Files/GitHub CLI"

python tools/collect_stats.py

git add stats.json
if git diff --cached --quiet; then
  echo "stats unchanged, nothing to push"
  exit 0
fi

last="$(git log -1 --pretty=%s)"
if [[ "$last" == stats:* ]]; then
  git commit -q --amend -m "stats: $(date -Iseconds)"
  git push -q --force-with-lease origin main
else
  git commit -q -m "stats: $(date -Iseconds)"
  git push -q origin main
fi
echo "published $(date -Iseconds)"
