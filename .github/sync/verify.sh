#!/usr/bin/env bash
# Verification gate: run after every sync rebase, before anything is pushed.
# Mirrors upstream's unit-tests.yml and svelte-check.yml.
#   verify.sh            (exit 0 = all checks pass)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
export CI=true   # pnpm refuses to rebuild node_modules without a TTY otherwise
rc=0
run() {
  echo "::group::$1"; shift
  if "$@"; then echo "::endgroup::"; return 0; fi
  local r=$?; echo "::endgroup::"; echo "::error::verify: '$*' failed (exit $r)"; rc=1; return $r
}
if git grep -lE '^(<<<<<<<|>>>>>>>) ' -- backend frontend tests .github; then
  echo "::error::verify: conflict markers present"; rc=1
fi
run "go build"      go -C backend build ./... \
  && run "go test"  go -C backend test -tags=exclude_frontend,unit ./...
run "pnpm install"        pnpm install --frozen-lockfile \
  && run "frontend build" pnpm -C frontend run build \
  && run "svelte-check"   pnpm -C frontend run check
[ $rc -eq 0 ] && echo "verify: all checks passed" || echo "verify: FAILED"
exit $rc
