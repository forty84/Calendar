#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BINARY="${ROOT_DIR}/build/calendar-app"

if [ ! -f "${BINARY}" ]; then
    echo "Binary not found. Building first..."
    "${ROOT_DIR}/scripts/build.sh"
fi

# Создаём директорию data в корне проекта, если приложение запускается из корня
mkdir -p "${ROOT_DIR}/data"

echo "==> Starting Local Calendar App..."
cd "${ROOT_DIR}"
"${BINARY}"