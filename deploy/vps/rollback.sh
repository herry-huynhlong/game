#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${INSTALL_DIR:-/var/www/thanh-van-ky}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"
SITE_DOMAIN="${SITE_DOMAIN:-_}"
[[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
[[ -L "$ROOT/previous" && -d "$(readlink -f "$ROOT/previous")" ]] || { echo 'No previous release is available.' >&2; exit 1; }
current="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
target="$(readlink -f "$ROOT/previous")"
ln -sfn "$current" "$ROOT/previous.next"
ln -sfn "$target" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
if ! nginx -t || ! systemctl reload nginx || ! curl --fail --silent --show-error --max-time 15 -H "Host: $SITE_DOMAIN" "$HEALTHCHECK_URL" -o /dev/null; then
  mv -Tf "$ROOT/previous.next" "$ROOT/current"
  systemctl reload nginx || true
  echo 'Rollback target failed healthcheck; restored the version that was current before rollback.' >&2
  exit 1
fi
mv -Tf "$ROOT/previous.next" "$ROOT/previous"
echo "Rolled back to $target."
