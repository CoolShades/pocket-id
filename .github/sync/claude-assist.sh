#!/usr/bin/env bash
# Ask Claude Code to repair the working tree during an upstream sync.
#   claude-assist.sh conflicts <tag> <file>...   resolve markers left by `git rebase`
#   claude-assist.sh verify    <tag> <logfile>   make verify.sh pass
# Exit 3 when Claude Code cannot run (no CLI, no credentials); callers fall back
# to asking a human. Any other non-zero exit means Claude ran but gave up.
set -euo pipefail
MODE=${1:?mode}; TAG=${2:?tag}; shift 2
cd "$(git rev-parse --show-toplevel)"
command -v claude >/dev/null || { echo "claude-assist: claude CLI not installed" >&2; exit 3; }
# Credentials: ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN in CI, or a local `claude` login.

CONTEXT="You are running unattended inside a CI job for a fork of pocket-id (https://github.com/pocket-id/pocket-id).
The fork carries ONE feature on top of upstream: a configurable, animated 'dynamic background' for the
login page (backend app-config fields + validation, a Svelte component + web worker under
frontend/src/lib/components/dynamic-background/, an admin settings tab/form, i18n keys, e2e specs).
Upstream is authoritative: its code must survive unchanged; the feature is re-applied on top of it,
adapted to whatever upstream has renamed, moved or restyled.
Rules: only edit files you must; never touch files unrelated to the feature; do not run git commands
that change history or the index (no add/commit/rebase/checkout/reset); do not modify lockfiles or
go.mod/go.sum unless a build error leaves no alternative. Use 'go -C backend ...' and 'pnpm -C frontend ...'
instead of cd. When done, print one line per file you changed saying what you did."

case "$MODE" in
  conflicts)
    FILES=("$@")
    SUBJECT=$(git log -1 --format=%s REBASE_HEAD)
    TOUCHED=$(git diff --name-only "REBASE_HEAD^" REBASE_HEAD | sed 's/^/  /')
    PROMPT="$CONTEXT

TASK: 'git rebase' is replaying the feature commit \"$SUBJECT\" onto upstream release $TAG and
stopped with conflicts in:
$(printf '  %s\n' "${FILES[@]}")

Marker semantics in THIS rebase:
  <<<<<<< HEAD           upstream $TAG code  -> keep all of it
  >>>>>>> <sha> ...      the feature's change being re-applied -> re-apply it on top
If upstream deleted or rewrote something the feature's hunk merely sat next to (an import, a class
string, a renamed helper), follow upstream and adapt the feature. Remove every conflict marker.
Context you can use: 'git diff REBASE_HEAD^ REBASE_HEAD -- <file>' shows the feature's original
change to a file; 'git show HEAD:<file>' shows upstream's version. All files touched by this commit:
$TOUCHED"
    ALLOWED=(Read Edit Write Grep Glob "Bash(git diff:*)" "Bash(git show:*)" "Bash(git log:*)" "Bash(git status:*)" "Bash(git grep:*)")
    ;;
  verify)
    LOG=${1:?logfile}
    FEATURE_FILES=$(git diff --name-only main HEAD | sed 's/^/  /')
    PROMPT="$CONTEXT

TASK: the feature was rebased onto upstream release $TAG without conflicts, but the verification gate
(.github/sync/verify.sh: go build, go unit tests, pnpm install, frontend build, svelte-check) failed.
Gate output (tail):
--------
$(tail -n 200 "$LOG")
--------
Fix the fork's feature code so the gate passes. The feature's files are:
$FEATURE_FILES
Re-run the failing check yourself to confirm (e.g. 'go -C backend build ./...', 'go -C backend test -tags=exclude_frontend,unit ./internal/...',
'pnpm -C frontend run check'). Run '.github/sync/verify.sh' at the end."
    ALLOWED=(Read Edit Write Grep Glob "Bash(git diff:*)" "Bash(git show:*)" "Bash(git log:*)" "Bash(git status:*)" "Bash(git grep:*)" "Bash(go:*)" "Bash(pnpm:*)" "Bash(.github/sync/verify.sh:*)")
    ;;
  *) echo "claude-assist: unknown mode $MODE" >&2; exit 1 ;;
esac

echo "claude-assist: mode=$MODE tag=$TAG"
claude -p "$PROMPT" \
  --tools "Read,Edit,Write,Grep,Glob,Bash" \
  --allowedTools "${ALLOWED[@]}" \
  --strict-mcp-config \
  --no-session-persistence \
  --max-budget-usd "${CLAUDE_ASSIST_BUDGET_USD:-10}" \
  --output-format text < /dev/null
