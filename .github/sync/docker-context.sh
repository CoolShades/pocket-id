#!/usr/bin/env bash
# Prepare the docker build context the way upstream's GoReleaser does
# (.goreleaser.yaml hooks + extra_files), so docker/Dockerfile-prebuilt and
# docker/Dockerfile-distroless can be built without GoReleaser Pro:
#   .tmp/frontend.cdx.json      frontend SBOM emitted by the frontend build
#   linux/<arch>/pocket-id      static binaries
# Requires a built frontend (backend/frontend/dist).
#   docker-context.sh [arch...]     default: amd64 arm64
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ARCHES=("$@"); [ ${#ARCHES[@]} -gt 0 ] || ARCHES=(amd64 arm64)

SBOM=backend/frontend/dist/cyclonedx/frontend.cdx.json
[ -f "$SBOM" ] || [ -f .tmp/frontend.cdx.json ] || { echo "docker-context: $SBOM missing - build the frontend first" >&2; exit 1; }
mkdir -p .tmp
# Move it out of dist before the Go build so it is not embedded and served as a static file.
if [ -f "$SBOM" ]; then mv "$SBOM" .tmp/frontend.cdx.json && rm -r backend/frontend/dist/cyclonedx; fi

VERSION=$(tr -d '[:space:]' < .version)
for ARCH in "${ARCHES[@]}"; do
  mkdir -p "linux/${ARCH}"
  CGO_ENABLED=0 GOOS=linux GOARCH="$ARCH" go -C backend build \
    -ldflags="-w -s -buildid=${VERSION} -X github.com/pocket-id/pocket-id/backend/internal/common.Version=${VERSION}" \
    -trimpath -o "../linux/${ARCH}/pocket-id" ./cmd
  echo "docker-context: linux/${ARCH}/pocket-id"
done
