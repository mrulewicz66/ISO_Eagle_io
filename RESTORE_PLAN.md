# VPS Clean Reinstall & Restore Plan

## Prerequisites
- Fresh Ubuntu 24.04 LTS VPS from Hostinger (reformatted)
- SSH access to the new VPS
- This repository cloned locally
- Database backup: `cointracker_backup.sql` (44MB, in this repo)

---

## Phase 1: Initial Server Setup (SSH as root)

### 1.1 Update System
```bash
apt update && apt upgrade -y
```

### 1.2 Install UFW Firewall FIRST (before anything else)
```bash
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 1.3 Install fail2ban
```bash
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### 1.4 (Optional but Recommended) SSH Key-Only Auth
```bash
# First, add your public key
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Then disable password auth
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

---

## Phase 2: Install Required Software

### 2.1 Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x
```

### 2.2 Install PostgreSQL 16
```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### 2.3 Install nginx
```bash
apt install -y nginx
systemctl enable nginx
```

### 2.4 Install PM2
```bash
npm install -g pm2
```

### 2.5 Install Git
```bash
apt install -y git
```

---

## Phase 3: Deploy Application

### 3.1 Create Web Directory
```bash
mkdir -p /var/www
cd /var/www
```

### 3.2 Clone Repository
```bash
git clone https://github.com/mrulewicz66/ISO_Eagle_io.git cointracker
cd cointracker
```

### 3.3 Install Backend Dependencies
```bash
cd /var/www/cointracker/backend
npm install
```

### 3.4 Install Frontend Dependencies & Build
```bash
cd /var/www/cointracker/frontend
npm install
npm run build
```

---

## Phase 4: Database Setup

### 4.1 Create Database and User
```bash
sudo -u postgres psql << 'EOF'
CREATE USER cointracker WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
CREATE DATABASE cointracker OWNER cointracker;
GRANT ALL PRIVILEGES ON DATABASE cointracker TO cointracker;
\q
EOF
```

### 4.2 Restore Database from Backup
```bash
# Upload cointracker_backup.sql to /tmp first, then:
sudo -u postgres psql -d cointracker < /tmp/cointracker_backup.sql
```

### 4.3 Configure PostgreSQL to Listen on Custom Port (5433)
```bash
# Edit postgresql.conf
sed -i "s/#port = 5432/port = 5433/" /etc/postgresql/16/main/postgresql.conf

# Restart PostgreSQL
systemctl restart postgresql
```

---

## Phase 5: Environment Configuration

### 5.1 Create Backend .env File
```bash
cat > /var/www/cointracker/backend/.env << 'EOF'
PORT=3001
DATABASE_URL=postgresql://cointracker:YOUR_SECURE_PASSWORD_HERE@localhost:5433/cointracker
COINGECKO_API_KEY=
COINGLASS_API_KEY=YOUR_COINGLASS_KEY
SOSOVALUE_API_KEY=YOUR_SOSOVALUE_KEY
CRYPTOQUANT_API_KEY=
NODE_ENV=production
EOF
```

### 5.2 Create Frontend .env File (if needed)
```bash
cat > /var/www/cointracker/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://isoeagle.io/api
EOF
```

---

## Phase 6: Configure nginx

### 6.1 Create nginx Site Config
```bash
cat > /etc/nginx/sites-available/isoeagle << 'EOF'
server {
    listen 80;
    server_name isoeagle.io www.isoeagle.io;

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/isoeagle /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

---

## Phase 7: Start Application with PM2

### 7.1 Start Backend
```bash
cd /var/www/cointracker/backend
pm2 start index.js --name backend
```

### 7.2 Start Frontend
```bash
cd /var/www/cointracker/frontend
pm2 start npm --name cointracker-web -- run start
```

### 7.3 Save PM2 Config & Enable Startup
```bash
pm2 save
pm2 startup systemd -u root --hp /root
```

---

## Phase 8: Cloudflare Setup (BEFORE SSL)

### 8.1 Add Domain to Cloudflare
1. Create Cloudflare account at https://cloudflare.com
2. Add site: `isoeagle.io`
3. Cloudflare will scan DNS records

### 8.2 Update Nameservers at Domain Registrar
- Change nameservers to Cloudflare's (provided during setup)
- Wait for propagation (can take up to 24 hours, usually faster)

### 8.3 Cloudflare DNS Settings
Add these records (use your VPS IP):
```
Type  | Name | Content      | Proxy
A     | @    | YOUR_VPS_IP  | Proxied (orange cloud)
A     | www  | YOUR_VPS_IP  | Proxied (orange cloud)
```

### 8.4 Cloudflare Security Settings
- **SSL/TLS**: Set to "Full (strict)" after Let's Encrypt setup
- **Security Level**: Medium or High
- **Bot Fight Mode**: ON
- **Under Attack Mode**: Available if needed (shows captcha)

### 8.5 Cloudflare Firewall Rules (Optional)
Block known malicious IPs:
- `38.181.20.122` (Hong Kong C2)
- `103.135.101.15` (Hong Kong C2)

---

## Phase 9: SSL Certificate (Let's Encrypt)

### 9.1 Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2 Obtain Certificate
```bash
certbot --nginx -d isoeagle.io -d www.isoeagle.io
```

### 9.3 Auto-Renewal (already configured by certbot)
```bash
certbot renew --dry-run  # Test renewal
```

---

## Phase 10: Monarx Malware Scanner (Hostinger Recommended)

### 10.1 Install Monarx
Hostinger may pre-install this, but if not:
```bash
# Check if already installed
which monarx-agent

# If not installed, Hostinger provides installation via hPanel
# Or contact Hostinger support for installation instructions
```

### 10.2 Verify Monarx is Running
```bash
systemctl status monarx-protect
ps aux | grep monarx
```

**Note**: Monarx was running on the compromised server but didn't detect the "kickd" botnet.
It's a good additional layer but don't rely on it exclusively.

---

## Phase 11: Final Security Checks

### 11.1 Verify Firewall
```bash
ufw status verbose
# Should show: 22, 80, 443 only
```

### 11.2 Verify Ports NOT Exposed
```bash
# From outside the server, these should NOT be accessible:
# - Port 3000 (Next.js)
# - Port 3001 (Backend API)
# - Port 5433 (PostgreSQL)
```

### 11.3 Block Known Malicious IPs (from previous incident)
```bash
iptables -A OUTPUT -d 38.181.20.122 -j DROP
iptables -A OUTPUT -d 103.135.101.15 -j DROP
apt install -y iptables-persistent
netfilter-persistent save
```

### 11.4 Verify Services
```bash
pm2 status
curl -s http://localhost:3000 | head -c 100
curl -s http://localhost:3001/health
```

---

## Phase 10: Verify Website

### 10.1 Test from Browser
- https://isoeagle.io/ - Should load dashboard
- https://isoeagle.io/api/health - Should return health status

### 10.2 Monitor Logs
```bash
pm2 logs --lines 50
```

---

## Quick Reference Commands

```bash
# View logs
pm2 logs backend --lines 50
pm2 logs cointracker-web --lines 50

# Restart services
pm2 restart all

# Check firewall
ufw status

# Check fail2ban
fail2ban-client status sshd

# Check nginx
nginx -t && systemctl status nginx

# Check PostgreSQL
systemctl status postgresql

# Check for suspicious connections
ss -tupn | grep -v "127.0.0.1\|::1"

# Check for suspicious processes
ps aux | grep -E "\[.*\]" | grep -v "^\["
```

---

## Files to Upload

Before running restore, upload these files from your local machine:
1. `cointracker_backup.sql` - Database backup (upload to /tmp)
2. `.env` files with API keys (or create manually as shown above)

---

## Estimated Time
- Phase 1-2: ~10 minutes
- Phase 3-4: ~15 minutes
- Phase 5-7: ~10 minutes
- Phase 8: ~5 minutes
- Phase 9-10: ~5 minutes

**Total: ~45 minutes for full restore**

---

*Created: December 11, 2025*
*For: isoeagle.io VPS restoration after security incident*
