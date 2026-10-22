#!/bin/sh
set -eu
rm -f /tmp/judge-images-ready
docker info > /dev/null
for language in cpp python; do
  image="${language}-sandbox:latest"
  dockerfile="/opt/judge-sandbox/Dockerfile.${language}"
  expected=$(sha256sum "$dockerfile" | cut -d ' ' -f 1)
  actual=$(docker image inspect --format '{{ index .Config.Labels "judge.dockerfile.sha256" }}' "$image" 2>/dev/null || true)
  if [ "$actual" != "$expected" ]; then
    printf '[Startup] Building %s...\n' "$image"
    docker build --label "judge.dockerfile.sha256=$expected" -t "$image" -f "$dockerfile" /opt/judge-sandbox
  fi
done
touch /tmp/judge-images-ready
exec judge-worker
