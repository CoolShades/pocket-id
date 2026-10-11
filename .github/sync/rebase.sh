#!/usr/bin/env bash
# Rebase the fork's feature commits onto <onto> (main, already synced to the
# upstream release <tag>), resolving conflicts without a human:
#   1. append-only hotspots (union-files.txt) use git's "union" merge driver
#   2. anything left is handed to claude-assist.sh
#
#   rebase.sh <tag> <onto> <feature>
#
# Exit 0: <feature> now sits on <onto>.
# Exit 2: unresolved conflict; the rebase was aborted and <feature> is untouched.
#         The conflicting files are listed in $SYNC_CONFLICTS_FILE if set.
set -euo pipefail
TAG=${1:?tag}; ONTO=${2:?onto}; FEATURE=${3:?feature}
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$(git rev-parse --show-toplevel)"
export GIT_EDITOR=true

ATTR="$(git rev-parse --git-path info)/attributes"
mkdir -p "$(dirname "$ATTR")"
grep -vE '^\s*(#|$)' "$HERE/union-files.txt" | while read -r f; do
  grep -qxF "$f merge=union" "$ATTR" 2>/dev/null || echo "$f merge=union" >> "$ATTR"
done

in_progress() {
  [ -d "$(git rev-parse --git-path rebase-merge)" ] || [ -d "$(git rev-parse --git-path rebase-apply)" ]
}
msgnum() { cat "$(git rev-parse --git-path rebase-merge/msgnum)" 2>/dev/null || echo 0; }
fail() {
  echo "::error::rebase: $1"
  [ -n "${SYNC_CONFLICTS_FILE:-}" ] && printf '%s\n' "${conflicted[@]:-}" > "$SYNC_CONFLICTS_FILE"
  git rebase --abort || true
  exit 2
}

git checkout -q "$FEATURE"
echo "rebase: $(git rev-list --count "$ONTO".."$FEATURE") feature commit(s) onto $ONTO ($TAG)"
if git rebase "$ONTO"; then
  echo "rebase: clean"
  exit 0
fi

conflicted=()
while in_progress; do
  conflicted=()
  while IFS= read -r f; do [ -n "$f" ] && conflicted+=("$f"); done < <(git diff --name-only --diff-filter=U)
  if ((${#conflicted[@]})); then
    echo "rebase: conflicts applying '$(git log -1 --format=%s REBASE_HEAD)':"
    printf '  %s\n' "${conflicted[@]}"
    "$HERE/ai-assist.sh" conflicts "$TAG" "${conflicted[@]}" || fail "could not resolve conflicts automatically"
    if git grep -lE '^(<<<<<<<|>>>>>>>) ' -- "${conflicted[@]}"; then
      fail "conflict markers left behind"
    fi
    # Stage everything: adapting the feature to upstream may touch files beyond the conflicted ones.
    git add -A
  fi
  before=$(msgnum)
  git rebase --continue || true
  if in_progress && [ "$(msgnum)" = "$before" ] && [ -z "$(git diff --name-only --diff-filter=U)" ]; then
    fail "no progress after resolution (commit became empty?)"
  fi
done
echo "rebase: done"
