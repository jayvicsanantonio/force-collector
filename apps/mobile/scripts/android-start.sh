#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_PORT:-8081}"

open_android_expo_go() {
  if ! command -v adb >/dev/null 2>&1; then
    echo "adb not found; skipping automatic Android launch."
    return
  fi

  local state
  state="$(adb get-state 2>/dev/null || true)"
  if [[ "$state" != "device" ]]; then
    echo "No Android device detected; Metro will continue running."
    return
  fi

  # Forward Metro and local Supabase ports for emulator/USB device access.
  adb reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null 2>&1 || true
  adb reverse tcp:54321 tcp:54321 >/dev/null 2>&1 || true
  adb shell monkey -p host.exp.exponent -c android.intent.category.LAUNCHER --pct-syskeys 0 1 >/dev/null 2>&1 || true
  adb shell am start -W -a android.intent.action.VIEW -d "exp://127.0.0.1:${PORT}" >/dev/null 2>&1 || true
}

(
  for _ in {1..45}; do
    if curl -s --max-time 1 "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  open_android_expo_go
) &

exec expo start --port "${PORT}"
