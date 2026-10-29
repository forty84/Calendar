#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8000}"

echo "==> Starting frontend development server (Mock mode) at http://localhost:${PORT}"
cd "${ROOT_DIR}/frontend"
python3 -m http.server "${PORT}"
