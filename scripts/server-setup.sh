#!/bin/bash
# One-time server setup for vk-mini-app
# Usage: sudo bash scripts/server-setup.sh <DOMAIN> <EMAIL> <GITHUB_USER>
# Example: sudo bash scripts/server-setup.sh board.example.com admin@example.com myusername
set -euo pipefail

DOMAIN=${1:?Usage: $0 <domain> <email> <github_user>}
EMAIL=${2:?Usage: $0 <domain> <email> <github_user>}
GITHUB_USER=${3:?Usage: $0 <domain> <email> <github_user>}

# ── Install Docker ────────────────────────────────────────────────────────────
echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
# Allow current user to use docker without sudo (requires re-login to take effect)
usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true

# ── Prepare app directory ─────────────────────────────────────────────────────
echo "==> Creating /opt/vk-board..."
mkdir -p /opt/vk-board/logs
cd /opt/vk-board

# ── Obtain initial SSL certificate ───────────────────────────────────────────
echo "==> Obtaining SSL certificate for $DOMAIN..."
echo "    (port 80 must be open and DNS must point to this server)"
docker run --rm \
  -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN"
echo "✅ SSL certificate obtained"

# ── Create .env.prod ──────────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 16)

cat > /opt/vk-board/.env.prod << EOF
GITHUB_REPO=${GITHUB_USER}/vk-mini-app
IMAGE_TAG=latest
DOMAIN=${DOMAIN}
POSTGRES_USER=boarduser
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=vk-board
JWT_SECRET=${JWT_SECRET}
VK_SECRET=REPLACE_WITH_VK_APP_SECRET
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  NEXT STEPS                                                     │"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│  1. Edit /opt/vk-board/.env.prod — replace VK_SECRET           │"
echo "│     nano /opt/vk-board/.env.prod                               │"
echo "│                                                                 │"
echo "│  2. Add these secrets in GitHub → Settings → Secrets:          │"
echo "│     SSH_HOST        = ${DOMAIN}"
echo "│     SSH_USER        = $(whoami)"
echo "│     SSH_PRIVATE_KEY = <your local private SSH key>             │"
echo "│     VITE_VK_APP_ID  = <your VK app id>                        │"
echo "│                                                                 │"
echo "│  3. Add SSH public key to this server's authorized_keys         │"
echo "│     (the key GitHub Actions will use to connect)               │"
echo "│                                                                 │"
echo "│  4. Push to main — GitHub Actions will build & deploy          │"
echo "└─────────────────────────────────────────────────────────────────┘"
