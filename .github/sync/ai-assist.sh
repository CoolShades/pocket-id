#!/usr/bin/env bash
# Ask a coding agent to repair the working tree during an upstream sync.
#   ai-assist.sh conflicts <tag> <file>...   resolve markers left by `git rebase`
#   ai-assist.sh verify    <tag> <logfile>   make verify.sh pass
#
# SYNC_AGENT=opencode (default)  OpenCode `run` against the fork's own model:
#     provider hpc-qwen/flash-next = Qwen Flash-Next on coolshades-hpc (vLLM),
#     reachable from the glados self-hosted runner over the tailnet.
#     Needs HPC_QWEN_BASE_URL + HPC_QWEN_API_KEY (see opencode.json).
# SYNC_AGENT=claude              Claude Code `-p` (ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN).
#
# Exit 3 when the agent cannot run (CLI missing); callers fall back to a human.
# Any other non-zero exit means the agent ran but gave up.
set -euo pipefail
MODE=${1:?mode}; TAG=${2:?tag}; shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$(git rev-parse --show-toplevel)"
AGENT=${SYNC_AGENT:-opencode}
# Forensics: with SYNC_LOG_DIR set, the transcript goes to agent-<tag>.log and
# OpenCode's own session store (every tool call and edit) to opencode-data/.
LOGDIR=${SYNC_LOG_DIR:-}
TRANSCRIPT=/dev/null
if [ -n "$LOGDIR" ]; then
  mkdir -p "$LOGDIR"
  TRANSCRIPT="$LOGDIR/agent-${SYNC_LOG_TAG:-$MODE}.log"
  export XDG_DATA_HOME="$LOGDIR/opencode-data"
fi
case "$AGENT" in
  opencode) command -v opencode >/dev/null || { echo "ai-assist: opencode CLI not installed" >&2; exit 3; } ;;
  claude)   command -v claude   >/dev/null || { echo "ai-assist: claude CLI not installed" >&2; exit 3; } ;;
  *) echo "ai-assist: unknown SYNC_AGENT=$AGENT" >&2; exit 1 ;;
esac

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
    OC_BASH='{"*":"deny","git diff *":"allow","git show *":"allow","git log *":"allow","git status*":"allow","git grep *":"allow","cat *":"allow","sed -n *":"allow","head *":"allow","tail *":"allow"}'
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
    OC_BASH='{"*":"deny","git diff *":"allow","git show *":"allow","git log *":"allow","git status*":"allow","git grep *":"allow","cat *":"allow","sed -n *":"allow","head *":"allow","tail *":"allow","go *":"allow","pnpm *":"allow",".github/sync/verify.sh*":"allow"}'
    ;;
  *) echo "claude-assist: unknown mode $MODE" >&2; exit 1 ;;
esac

echo "ai-assist: agent=$AGENT mode=$MODE tag=$TAG"
{ echo "=== $(date -u +%FT%TZ) agent=$AGENT mode=$MODE tag=$TAG"; echo "--- prompt"; echo "$PROMPT"; echo "--- transcript"; } > "$TRANSCRIPT"
case "$AGENT" in
  claude)
    claude -p "$PROMPT" \
      --tools "Read,Edit,Write,Grep,Glob,Bash" \
      --allowedTools "${ALLOWED[@]}" \
      --strict-mcp-config \
      --no-session-persistence \
      --max-budget-usd "${CLAUDE_ASSIST_BUDGET_USD:-10}" \
      --output-format text < /dev/null 2>&1 | tee -a "$TRANSCRIPT"
    ;;
  opencode)
    : "${HPC_QWEN_BASE_URL:?set HPC_QWEN_BASE_URL (e.g. http://100.125.96.35:18020/v1)}"
    : "${HPC_QWEN_API_KEY:?set HPC_QWEN_API_KEY}"
    export OPENCODE_CONFIG="$HERE/opencode.json"
    # Hermetic: ignore any user-level ~/.config/opencode (agents/permissions) wherever this runs.
    export XDG_CONFIG_HOME="$(mktemp -d)"
    # Permissions are explicit per mode so nothing ever "asks" in a non-interactive run.
    export OPENCODE_PERMISSION="{\"*\":\"deny\",\"read\":\"allow\",\"glob\":\"allow\",\"grep\":\"allow\",\"list\":\"allow\",\"edit\":\"allow\",\"todowrite\":\"allow\",\"todoread\":\"allow\",\"task\":\"deny\",\"webfetch\":\"deny\",\"websearch\":\"deny\",\"bash\":$OC_BASH}"
    export OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_AUTO_SHARE=0
    opencode run --model "${SYNC_MODEL:-hpc-qwen/flash-next}" --format default "$PROMPT" < /dev/null 2>&1 | tee -a "$TRANSCRIPT"
    ;;
esac
