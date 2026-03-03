#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_PORT:-8081}"
EXPO_GO_CACHE_DIR="${HOME}/.expo/ios-simulator-app-cache"

resolve_expo_go_bundle() {
  if [[ ! -d "${EXPO_GO_CACHE_DIR}" ]]; then
    return
  fi

  find "${EXPO_GO_CACHE_DIR}" -maxdepth 1 -name 'Expo-Go-*.app' 2>/dev/null |
    sort |
    tail -n 1
}

boot_first_available_simulator() {
  local booted_udid
  booted_udid="$(
    xcrun simctl list devices available |
      sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' |
      head -n 1
  )"

  if [[ -n "${booted_udid}" ]]; then
    return
  fi

  local simulator_udid
  simulator_udid="$(
    xcrun simctl list devices available |
      sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Shutdown).*/\1/p' |
      head -n 1
  )"

  if [[ -z "${simulator_udid}" ]]; then
    echo "No available iOS simulator found; Metro will continue running."
    return
  fi

  xcrun simctl boot "${simulator_udid}" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "${simulator_udid}" -b >/dev/null 2>&1 || true
}

open_ios_expo_go() {
  boot_first_available_simulator

  local expo_go_bundle
  expo_go_bundle="$(resolve_expo_go_bundle)"
  if [[ -n "${expo_go_bundle}" && -d "${expo_go_bundle}" ]]; then
    xcrun simctl install booted "${expo_go_bundle}" >/dev/null 2>&1 || true
  fi

  xcrun simctl launch booted host.exp.Exponent >/dev/null 2>&1 || true
  xcrun simctl openurl booted "exp://127.0.0.1:${PORT}" >/dev/null 2>&1 || true
}

(
  for _ in {1..45}; do
    if curl -s --max-time 1 "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  open_ios_expo_go
) &

exec expo start --port "${PORT}"
