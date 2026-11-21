# Static VPS deployment

This is a Vite/Phaser frontend. GitHub Actions runs `npm ci`, tests, validation, and `npm run build`; the VPS receives only a prebuilt release archive. `deploy.sh` never invokes Node, npm, Git, or a compiler.

## Publish a version

Push source to the repository's `main`/`master` branch to produce a downloadable Actions artifact. To publish an installable version, push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The tag workflow attaches `thanh-van-ky-v1.0.0.tar.gz` and `SHA256SUMS` to a GitHub Release. Enable GitHub Actions and allow the workflow's `GITHUB_TOKEN` to create releases.

## VPS prerequisites

Use an Ubuntu/Debian VPS with `curl`, `python3`, `tar`, `sha256sum`, Nginx, and systemd. Install Nginx once through the OS package manager (for example `sudo apt-get update && sudo apt-get install -y nginx curl python3`). Set DNS to the VPS and open TCP 80 (and 443 if TLS is terminated separately).

Download this script from the repository's raw URL or copy it to the server once. Then deploy latest:

```bash
sudo env GITHUB_REPOSITORY=OWNER/REPO SITE_DOMAIN=game.example.com bash deploy.sh latest
```

Deploy an exact release instead:

```bash
sudo env GITHUB_REPOSITORY=OWNER/REPO SITE_DOMAIN=game.example.com bash deploy.sh v1.0.0
```

For a private repository, provide a short-lived, read-only GitHub token in the invoking environment as `GH_TOKEN`; do not put it in this repository or in the app bundle. The script verifies the release's SHA-256 checksum, unpacks under `/var/www/thanh-van-ky/releases/`, atomically switches `current`, reloads Nginx, and checks `http://127.0.0.1/`. A failed health check restores the prior symlink. Browser save data remains in the player's browser storage under the same site origin; deployment does not clear it. Server-side saves are not part of this frontend deployment.

## Update and rollback

Run the same deploy command after publishing a new tag, or use `latest` to select the newest GitHub Release:

```bash
sudo env GITHUB_REPOSITORY=OWNER/REPO SITE_DOMAIN=game.example.com bash deploy.sh latest
```

Rollback to the preceding healthy version:

```bash
sudo bash rollback.sh
```

To health-check manually, run `curl -fsS http://127.0.0.1/` on the VPS or open `http://game.example.com/` in a browser. Configure TLS with the VPS's existing Nginx/Certbot or Caddy setup; the static build itself has no server process.
