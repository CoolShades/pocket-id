#!/usr/bin/env bash
# Verification gate: run after every sync rebase, before anything is pushed.
# Mirrors upstream's unit-tests.yml and svelte-check.yml.
#   verify.sh            (exit 0 = all checks pass)
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$(git rev-parse --show-toplevel)"
export CI=true   # pnpm refuses to rebuild node_modules without a TTY otherwise
rc=0
run() {
  echo "::group::$1"; shift
  local r=0; "$@" || r=$?
  echo "::endgroup::"
  [ $r -eq 0 ] || { echo "::error::verify: '$*' failed (exit $r)"; rc=1; }
  return $r
}
if git grep -lE '^(<<<<<<<|>>>>>>>) ' -- backend frontend tests .github; then
  echo "::error::verify: conflict markers present"; rc=1
fi
# Frontend first: the Go binary embeds backend/frontend/dist, so `go build`
# without -tags=exclude_frontend needs it to exist.
run "pnpm install"        pnpm install --frozen-lockfile \
  && run "frontend build" pnpm -C frontend run build \
  && run "svelte-check"   pnpm -C frontend run check
run "go build"      go -C backend build ./... \
  && run "go test"  go -C backend test -tags=exclude_frontend,unit ./...
# The fork image is what actually ships: prove the Dockerfiles still build from our context.
if [ $rc -eq 0 ] && command -v docker >/dev/null 2>&1; then
  ARCH=$(go env GOARCH)
  run "docker context"            "$HERE/docker-context.sh" "$ARCH" \
    && run "docker build prebuilt"   docker build --platform "linux/$ARCH" -f docker/Dockerfile-prebuilt   -t pocket-id-verify:prebuilt . \
    && run "docker build distroless" docker build --platform "linux/$ARCH" -f docker/Dockerfile-distroless -t pocket-id-verify:distroless .
  rm -rf linux   # not gitignored; keep it out of any follow-up commit
else
  echo "verify: docker not available or earlier failure - skipping image build"
fi
[ $rc -eq 0 ] && echo "verify: all checks passed" || echo "verify: FAILED"
exit $rc
