#!/usr/bin/env bash
# Refresh stats.json from this PC and publish it to GitHub Pages.
# Run by the Hermes cron job "stats-refresh" every 5 minutes.
#
# To avoid ~144 commits a day, stats are folded into one rolling commit: if the
# previous commit is also a stats commit it gets amended. Amending is only safe
# when HEAD sits directly on origin/main, so we sync FIRST: if the remote moved
# (or an earlier force-push left local refs stale) we reset onto origin/main
# instead of pushing a diverged branch. That divergence is what broke this job
# on 2026-10-24 with "! [rejected] main -> main".
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:/c/Program Files/GitHub CLI"

git fetch -q origin main || { echo "fetch failed"; exit 1; }
if ! git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  git reset --hard -q origin/main
fi

python tools/collect_stats.py

git add stats.json
if git diff --cached --quiet; then
  echo "stats unchanged, nothing to push"
  exit 0
fi

last="$(git log -1 --pretty=%s)"
head_sha="$(git rev-parse HEAD)"
origin_sha="$(git rev-parse origin/main)"
parent_sha="$(git rev-parse HEAD^)"
# Amend only when HEAD is our own stats commit sitting on/at origin/main:
#   already pushed (head == origin)  -> amend + force-with-lease
#   one ahead, parent == origin      -> amend + normal push
if [[ "$last" == stats:* ]] && { [ "$head_sha" = "$origin_sha" ] || [ "$parent_sha" = "$origin_sha" ]; }; then
  git commit -q --amend -m "stats: $(date -Iseconds)"
  git push -q --force-with-lease origin main
else
  git commit -q -m "stats: $(date -Iseconds)"
  git push -q origin main
fi
echo "published $(date -Iseconds)"
