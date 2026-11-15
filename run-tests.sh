#!/usr/bin/env bash
set -euo pipefail

exec docker compose run --rm app npm test "$@"
