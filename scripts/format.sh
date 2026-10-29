#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v clang-format &> /dev/null; then
    echo "clang-format is not installed. Skipping C++ formatting."
    exit 0
fi

echo "==> Formatting C++ files..."
find "${ROOT_DIR}/include" "${ROOT_DIR}/src" "${ROOT_DIR}/tests" \
    -type f \( -name "*.hpp" -o -name "*.h" -o -name "*.cpp" \) \
    -exec clang-format -i {} +

echo "==> Formatting complete."
