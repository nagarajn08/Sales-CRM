#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# TrackmyLead — VPS Deployment Script
# Tested on Ubuntu 22.04 / 24.04
#
# First deploy  (run as root or with sudo):
#   chmod +x deploy.sh && sudo ./deploy.sh
#
# Re-deploy / update to latest code:
#   sudo ./deploy.sh --update
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="trackmylead.in"
EMAIL="mr.nagarajn08@gmail.com"
APP_DIR="/opt/trackmylead"
UPDATE_MODE=false

[[ "$1" == "--update" ]] && UPDATE_MODE=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. System packages ────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get install -y --no-install-recommends curl git ufw certbot

# ── 2. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    [[ -n "$SUDO_USER" ]] && usermod -aG docker "$SUDO_USER" && \
        info "Added $SUDO_USER to docker group — re-login for non-sudo docker commands"
else
    info "Docker already installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null 2>&1; then
    info "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
else
    info "Docker Compose: $(docker compose version)"
fi

# ── 3. Firewall ───────────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
info "Firewall: SSH + HTTP + HTTPS allowed"

# ── 4. Pull / clone repo ──────────────────────────────────────────────────────
if $UPDATE_MODE; then
    info "Pulling latest code..."
    cd "$APP_DIR"
    git pull origin master
else
    if [ -d "$APP_DIR/.git" ]; then
        warn "$APP_DIR already exists — use --update to pull latest code"
    else
        info "Cloning repository to $APP_DIR..."
        mkdir -p "$APP_DIR"
        # If running from the repo directory (e.g. scp'd), copy it instead
        if [ -f "$(pwd)/docker-compose.prod.yml" ] && [ "$(pwd)" != "$APP_DIR" ]; then
            cp -r "$(pwd)/." "$APP_DIR/"
            info "Copied project files to $APP_DIR"
        else
            error "Place the project at $APP_DIR or run from the repo root"
        fi
    fi
    cd "$APP_DIR"
fi

# ── 5. .env file ──────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    info "Creating .env from template..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"

    # Auto-generate secrets
    SECRET=$(openssl rand -hex 32)
    DBPASS=$(openssl rand -hex 16)
    sed -i "s|^SECRET_KEY=$|SECRET_KEY=$SECRET|"       "$APP_DIR/.env"
    sed -i "s|^DB_PASSWORD=$|DB_PASSWORD=$DBPASS|"     "$APP_DIR/.env"

    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ACTION REQUIRED — fill in .env before continuing:${NC}"
    echo -e "${YELLOW}    nano $APP_DIR/.env${NC}"
    echo ""
    echo -e "${YELLOW}  Minimum required values to set:${NC}"
    echo -e "${YELLOW}    ADMIN_PASSWORD    — your admin login password${NC}"
    echo -e "${YELLOW}    SMTP_*            — for OTP emails (or leave empty to disable)${NC}"
    echo ""
    echo -e "${YELLOW}  SECRET_KEY and DB_PASSWORD have been auto-generated.${NC}"
    echo ""
    echo -e "${YELLOW}  Then re-run:  sudo $APP_DIR/deploy.sh --update${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    exit 0
fi

# Validate required vars are set
set -a; source "$APP_DIR/.env"; set +a
[[ -z "$SECRET_KEY"     ]] && error "SECRET_KEY is empty — run: openssl rand -hex 32"
[[ -z "$DB_PASSWORD"    ]] && error "DB_PASSWORD is empty in .env"
[[ -z "$ADMIN_PASSWORD" ]] && error "ADMIN_PASSWORD is empty in .env"

# ── 6. SSL certificate ────────────────────────────────────────────────────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    info "Requesting SSL certificate for $DOMAIN and www.$DOMAIN..."
    # Certbot standalone needs port 80 free
    docker compose -f "$APP_DIR/docker-compose.prod.yml" down 2>/dev/null || true

    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email  "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        || error "Certbot failed — verify DNS: dig +short $DOMAIN should return this server's IP"

    info "SSL certificate issued"
else
    info "SSL certificate already exists — skipping"
fi

# ── 7. Auto-renewal cron (runs daily at 03:00) ────────────────────────────────
RENEW_CMD="0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml exec -T frontend nginx -s reload 2>/dev/null || true"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$RENEW_CMD") | crontab -
    info "SSL auto-renewal cron installed"
fi

# ── 8. Build and start all services ──────────────────────────────────────────
cd "$APP_DIR"
info "Pulling latest postgres image..."
docker compose -f docker-compose.prod.yml pull postgres

info "Building and starting services (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# ── 9. Health check ───────────────────────────────────────────────────────────
info "Waiting for services to come up..."
sleep 12

HEALTHY=false
for i in $(seq 1 12); do
    HTTP=$(curl -o /dev/null -s -w "%{http_code}" "https://$DOMAIN/api/" 2>/dev/null || echo "000")
    if [[ "$HTTP" == "200" || "$HTTP" == "422" ]]; then
        HEALTHY=true; break
    fi
    echo -n "."
    sleep 5
done
echo ""

if $HEALTHY; then
    info "API responded — services are healthy"
else
    warn "Health check timed out — services may still be starting"
    warn "Check logs: docker compose -f $APP_DIR/docker-compose.prod.yml logs --tail=50"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  TrackmyLead is live!${NC}"
echo -e "${GREEN}  URL  :  https://$DOMAIN${NC}"
echo -e "${GREEN}  Logs :  docker compose -f $APP_DIR/docker-compose.prod.yml logs -f${NC}"
echo -e "${GREEN}  Stop :  docker compose -f $APP_DIR/docker-compose.prod.yml down${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
