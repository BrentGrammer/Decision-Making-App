#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -x "$project_dir/node_modules/.bin/playwright" ]]; then
    echo "Project dependencies are missing. Run npm ci first." >&2
    exit 1
fi

sudo docker run --rm --ipc=host \
    --volume "$project_dir:/app" \
    --workdir /app \
    mcr.microsoft.com/playwright:v1.63.0-noble \
    npx playwright test "$@"
