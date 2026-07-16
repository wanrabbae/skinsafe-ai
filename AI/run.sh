#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -x .venv/bin/fastapi ] || { python3.12 -m venv .venv && .venv/bin/pip install -q -e .; }
exec .venv/bin/fastapi dev app/main.py
