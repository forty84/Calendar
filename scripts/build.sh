#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"

echo "==> Configuring CMake project..."
cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" -DCMAKE_BUILD_TYPE=Release

echo "==> Building project and tests..."
cmake --build "${BUILD_DIR}" --parallel $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

echo "==> Running unit tests..."
ctest --test-dir "${BUILD_DIR}" --output-on-failure

echo "==> Build completed successfully! Binary is at: ${BUILD_DIR}/calendar-app"