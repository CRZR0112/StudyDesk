#!/usr/bin/env bash
set -euo pipefail

# StudyDesk one-command server installer for Debian 12.
# Usage: curl -fsSL https://raw.githubusercontent.com/CRZR0112/StudyDesk/main/deploy/install.sh | bash
# Optional: pass a domain: ... | bash -s -- study.example.com

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root." >&2
  exit 1
fi

REPO="https://github.com/CRZR0112/StudyDesk.git"
DIR="/opt/studydesk"
IP="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
DEFAULT_DOMAIN="$(printf '%s' "$IP" | tr '.' '-').sslip.io"
DOMAIN="${1:-$DEFAULT_DOMAIN}"

echo "== StudyDesk server installer =="
echo "Public IP : $IP"
echo "Domain    : $DOMAIN"
echo

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

if [ -d "$DIR/.git" ]; then
  echo "Updating existing checkout..."
  git -C "$DIR" fetch --depth 1 origin main
  git -C "$DIR" reset --hard origin/main
else
  echo "Cloning StudyDesk..."
  rm -rf "$DIR"
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR"
cat > .env <<EOF
DOMAIN=$DOMAIN
STUDYDESK_PUBLIC_URL=https://$DOMAIN
STUDYDESK_PIN=
EOF

echo "Building and starting containers..."
docker compose up -d --build

echo
echo "Waiting for HTTPS certificate..."
for i in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo "OK: https://$DOMAIN"
    echo "Open it, register the first account, then log in."
    exit 0
  fi
  sleep 4
done

echo "The app is running but HTTPS is not ready yet." >&2
echo "Check logs with: cd $DIR && docker compose logs -f caddy app" >&2
exit 1
