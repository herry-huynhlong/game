#!/usr/bin/env bash
set -Eeuo pipefail

# Downloads a prebuilt GitHub Release archive. This host never checks out source or runs npm.
REPOSITORY="${GITHUB_REPOSITORY:-}"
TAG="${1:-latest}"
ROOT="${INSTALL_DIR:-/var/www/thanh-van-ky}"
SITE_DOMAIN="${SITE_DOMAIN:-_}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/thanh-van-ky}"
STAGING=""

fail() { echo "ERROR: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail "Run as root (example: sudo env GITHUB_REPOSITORY=owner/repo bash deploy.sh v1.2.0)."
[[ -n "$REPOSITORY" && "$REPOSITORY" == */* ]] || fail "Set GITHUB_REPOSITORY=owner/repo."
[[ "$TAG" == latest || "$TAG" =~ ^[A-Za-z0-9._-]+$ ]] || fail "Release tag contains unsupported characters."
for cmd in curl tar sha256sum python3 nginx systemctl; do command -v "$cmd" >/dev/null || fail "Missing required command: $cmd"; done

mkdir -p "$ROOT/releases" "$ROOT/shared"
STAGING="$(mktemp -d "$ROOT/.deploy.XXXXXX")"
cleanup() { [[ -z "$STAGING" ]] || rm -rf -- "$STAGING"; }
trap cleanup EXIT

api="https://api.github.com/repos/$REPOSITORY/releases"
if [[ "$TAG" == latest ]]; then endpoint="$api/latest"; else endpoint="$api/tags/$TAG"; fi
auth=()
[[ -z "${GH_TOKEN:-}" ]] || auth=(-H "Authorization: Bearer $GH_TOKEN")
curl --fail --silent --show-error --location "${auth[@]}" -H 'Accept: application/vnd.github+json' "$endpoint" -o "$STAGING/release.json" \
  || fail "Could not read GitHub Release ($endpoint). For private repos export GH_TOKEN with release read access."

python3 - "$STAGING/release.json" "$STAGING/assets.tsv" <<'PY'
import json, sys
release=json.load(open(sys.argv[1], encoding='utf-8'))
archive=next((a for a in release.get('assets', []) if a['name'].startswith('thanh-van-ky-') and a['name'].endswith('.tar.gz')), None)
checks=next((a for a in release.get('assets', []) if a['name']=='SHA256SUMS'), None)
if not archive or not checks:
    raise SystemExit('Release is missing the build archive or SHA256SUMS asset.')
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    f.write(release['tag_name']+'\n'+archive['name']+'\n'+archive['browser_download_url']+'\n'+checks['browser_download_url']+'\n')
PY
mapfile -t meta < "$STAGING/assets.tsv"
release_tag="${meta[0]}"; archive_name="${meta[1]}"; archive_url="${meta[2]}"; sums_url="${meta[3]}"
[[ "$release_tag" =~ ^[A-Za-z0-9._-]+$ ]] || fail "Unexpected release tag."
curl --fail --silent --show-error --location "${auth[@]}" "$archive_url" -o "$STAGING/$archive_name"
curl --fail --silent --show-error --location "${auth[@]}" "$sums_url" -o "$STAGING/SHA256SUMS"
expected_hash="$(awk -v name="$archive_name" '$2 == name || $2 == "release/" name || $2 == "*" name || $2 == "*release/" name { print $1; exit }' "$STAGING/SHA256SUMS")"
[[ "$expected_hash" =~ ^[A-Fa-f0-9]{64}$ ]] || fail "Release checksum file has no valid entry for $archive_name."
actual_hash="$(sha256sum "$STAGING/$archive_name" | awk '{ print $1 }')"
[[ "$actual_hash" == "$expected_hash" ]] || fail "Release checksum verification failed."

release_dir="$ROOT/releases/$release_tag"
active="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
if [[ "$active" == "$release_dir" ]]; then
  echo "$release_tag is already active; verified release checksum and current healthcheck target."
  exit 0
fi
if [[ ! -e "$release_dir" ]]; then
  mkdir -p "$release_dir"
  tar -xzf "$STAGING/$archive_name" -C "$release_dir"
fi
[[ -s "$release_dir/index.html" ]] || fail "Archive has no index.html."
[[ -s "$release_dir/maps/world-rebuild-1b.tmj" ]] || fail "Archive is missing the runtime map."

cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $SITE_DOMAIN;
    root $ROOT/current;
    index index.html;
    location = /index.html { add_header Cache-Control "no-cache"; }
    location / { try_files \$uri \$uri/ /index.html; }
    location ~* \.(?:js|css|png|webp|jpg|jpeg|gif|svg|woff2?)\$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }
}
NGINX
ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/thanh-van-ky
if [[ -L "$ROOT/current" ]]; then previous="$(readlink -f "$ROOT/current")"; else previous=""; fi
ln -sfn "$release_dir" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"

rollback_current() {
  if [[ -n "$previous" && -d "$previous" ]]; then ln -sfn "$previous" "$ROOT/current.rollback"; mv -Tf "$ROOT/current.rollback" "$ROOT/current"; fi
}
if ! nginx -t || ! systemctl reload nginx; then rollback_current; systemctl restart nginx || true; fail "Nginx rejected the release; previous version restored."
fi
if ! curl --fail --silent --show-error --max-time 15 -H "Host: $SITE_DOMAIN" "$HEALTHCHECK_URL" -o /dev/null; then
  rollback_current
  systemctl reload nginx || true
  fail "Healthcheck failed; previous version restored."
fi
if [[ -n "$previous" ]]; then ln -sfn "$previous" "$ROOT/previous"; fi
echo "Deployed $release_tag to $ROOT/current; healthcheck passed at $HEALTHCHECK_URL."
