# Security Incident Postmortem - December 6, 2025

## Incident Summary

On December 6, 2025, Hostinger suspended the isoeagle.io VPS due to "abuse" - specifically, DDoS activity originating from the server. Investigation revealed the server had been compromised and was being used as part of a botnet to launch UDP flood attacks (10+ million packets in 24 hours).

## Timeline

| Time (UTC) | Event |
|------------|-------|
| Dec 5, ~05:00 | Puppeteer web scraper deployed to fetch XRP ETF data from SoSoValue |
| Dec 5, ~05:30 | Server crashed due to Puppeteer memory consumption |
| Dec 5-6 | Server repeatedly crashed and became unresponsive |
| Dec 6, ~12:00 | Hostinger suspended VPS for DDoS activity |
| Dec 6, 13:08 | VPS re-enabled by Hostinger after user request |
| Dec 6, 13:09 | Investigation and remediation began |
| Dec 6, 13:45 | Initial security sweep completed |
| Dec 7, 04:10 | Second security sweep discovered additional malware |
| Dec 7, 04:20 | All malware components removed, server fully secured |
| Dec 7, 04:26 | fail2ban installed for SSH brute force protection |
| Dec 7, 04:33 | Third security sweep - identified "kickd" DDoS botnet malware |
| Dec 7, 04:40 | Immutable decoy files deployed to prevent malware respawn |

## Root Cause Analysis

### Primary Cause: Next.js Remote Code Execution Vulnerability

The server was running Next.js version 16.0.4, which contained a **critical RCE (Remote Code Execution) vulnerability** ([GHSA-9qr9-h5gf-34mp](https://github.com/advisories/GHSA-9qr9-h5gf-34mp)).

This vulnerability in the React Flight protocol allowed attackers to execute arbitrary code on the server. The attackers used this to:
1. Install malware/backdoor
2. Establish connections to Command & Control (C2) servers in Hong Kong
3. Use the server as a node in a DDoS botnet

### Contributing Factors

1. **No Firewall (UFW)**: The server had no firewall enabled, leaving all ports exposed
2. **Exposed Application Ports**: Ports 3000 (Next.js) and 3001 (backend API) were directly accessible from the internet, bypassing nginx
3. **Outdated Dependencies**: npm packages were not regularly audited for vulnerabilities

## Evidence of Compromise

### Suspicious Network Connections

```
38.181.20.122:3389  - Hong Kong Communications International Co. (RDP backdoor)
103.135.101.15:12348 - LANDUPS LIMITED, Hong Kong (C2 server)
```

### DDoS Activity

- 10+ million UDP packets dropped in 24 hours
- Traffic pattern indicated participation in UDP flood attacks against third parties

### Malware Components Discovered

#### Primary Malware: "kickd" DDoS Botnet

**Binary Details:**
```
Name: seeintlog (disguised as system log file)
Location: /tmp/seeintlog
Type: ELF 64-bit LSB executable, x86-64, statically linked, Go binary
Build ID: 9f3aGTNZ1NqDQgjyl7Bs/QGy4ge3vDxRLRpuKggby/KTQeE9n5NZZsIG16ifyG/7KQSl1XiJmykz3-kickd
Purpose: UDP flood DDoS attacks as part of botnet
```

**Configuration Files:**
```
/tmp/.walk     - C2 server addresses (hex encoded)
/tmp/.walk.lod - Additional C2 configuration
```

**Evasion Techniques:**
1. Process masqueraded as kernel thread `[ksoftirqd/0]`
2. Ran under `_apt` user instead of root to avoid detection
3. Fileless execution - binary deleted itself after loading into memory
4. Respawned via apt package manager hooks when `apt-get update` ran

#### Persistence Mechanisms

1. **Cron Job** (found Dec 7)
   ```
   */1 * * * * root /.mod
   ```
   Malware ran every minute from crontab.

2. **Hidden Binary** (found Dec 7)
   ```
   /usr/lib/libgdi.so.0.8.1/.mod
   ```
   Disguised as a system library directory. Actually a bash script that maintained C2 connections.

3. **Root-level Binary**
   ```
   /.mod
   ```
   Main persistence binary at filesystem root.

4. **Camouflaged Process** (found Dec 7)
   ```
   PID 18043: [ksoftirqd/0] - running as _apt user
   ```
   Malware disguised as a kernel thread (real ksoftirqd runs as root at PID 16).

### Auth Log Analysis

- All SSH logins were from the legitimate user IP (24.11.231.100)
- No evidence of SSH brute force success
- Attack vector was the Next.js RCE, not SSH

## Remediation Actions

### Immediate Actions

1. **Blocked Malicious IPs**
   ```bash
   iptables -A OUTPUT -d 38.181.20.122 -j DROP
   iptables -A OUTPUT -d 103.135.101.15 -j DROP
   ```

2. **Killed Suspicious Processes**
   - Terminated orphan Chrome/Puppeteer processes
   - Disabled the Puppeteer scraper to prevent resource exhaustion

3. **Malware Removal** (Dec 7)
   ```bash
   # Removed malware cron job
   sed -i "/\.mod/d" /etc/crontab

   # Deleted malware files
   rm -f /.mod
   rm -rf /usr/lib/libgdi.so.0.8.1/

   # Killed camouflaged malware process
   kill -9 18043
   ```

4. **Immutable Decoy Files** (Dec 7, 04:33)
   To prevent the "kickd" malware from respawning via apt hooks:
   ```bash
   # Remove malware files
   rm -f /tmp/seeintlog /tmp/.walk /tmp/.walk.lod

   # Create empty decoy files
   touch /tmp/seeintlog /tmp/.walk /tmp/.walk.lod

   # Make them immutable (cannot be modified or deleted)
   chattr +i /tmp/seeintlog /tmp/.walk /tmp/.walk.lod
   ```
   This prevents the malware from recreating itself even if triggered.

5. **Database Backup**
   - Created full PostgreSQL backup (44MB) before any remediation
   - Backup stored locally: `cointracker_backup.sql`

### Security Hardening

1. **Patched Next.js Vulnerability**
   ```bash
   cd /var/www/cointracker/frontend
   npm audit fix --force
   # Updated next: 16.0.4 -> 16.0.7
   npm run build
   ```

2. **Installed and Configured UFW Firewall**
   ```bash
   apt-get install -y ufw
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22/tcp   # SSH
   ufw allow 80/tcp   # HTTP
   ufw allow 443/tcp  # HTTPS
   ufw enable
   ```

3. **Verified Port Blocking**
   - Ports 3000 and 3001 now only accessible via localhost
   - External access blocked by firewall
   - Traffic must go through nginx reverse proxy

4. **Made Firewall Rules Persistent**
   ```bash
   apt-get install -y iptables-persistent
   ```

5. **Installed fail2ban for SSH Protection**
   ```bash
   apt-get install -y fail2ban
   # Configuration: /etc/fail2ban/jail.local
   # SSH jail: 3 failed attempts = 24 hour ban
   ```
   Already blocking 209.38.41.180 (SSH brute force attacker).

## Current Security Posture

### Firewall Status (UFW)
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### npm Audit Status
- Backend: 0 vulnerabilities
- Frontend: 0 vulnerabilities (after fix)

### Services Status
- nginx: Running (enabled on boot)
- PM2: Running with saved config
- PostgreSQL: Running on localhost:5433 only
- fail2ban: Running (SSH jail active, 1 IP banned)

### Malware Prevention Status
- Immutable decoy files in place: `/tmp/seeintlog`, `/tmp/.walk`, `/tmp/.walk.lod`
- C2 IPs blocked via iptables OUTPUT rules (235+ packets dropped)
- No suspicious processes running
- All crontabs clean
- No ld.so.preload injection
- No suspicious SUID binaries

## Lessons Learned

1. **Keep Dependencies Updated**: Regular `npm audit` checks are essential
2. **Firewall is Mandatory**: Never run a production server without a firewall
3. **Minimize Attack Surface**: Application ports should never be directly exposed; always use a reverse proxy
4. **Monitor for Anomalies**: Consider setting up monitoring for unusual network activity
5. **Separate Concerns**: Resource-intensive tasks (like Puppeteer scraping) should run on separate infrastructure or with strict resource limits
6. **Fileless Malware Requires Multiple Sweeps**: Modern malware uses sophisticated evasion - check /tmp, process lists, and crontabs repeatedly
7. **Immutable Decoys**: Use `chattr +i` to create immutable empty files at known malware paths to prevent recreation

## Recommendations for Future

### Short-term
- [x] Set up fail2ban for SSH brute force protection (DONE - Dec 7)
- [ ] Configure SSH key-only authentication (disable password login)
- [ ] Set up automated npm audit checks in CI/CD

### Medium-term
- [ ] Implement monitoring/alerting for unusual network activity
- [ ] Set up automated security updates
- [ ] Consider moving web scraping to a separate lightweight VPS or serverless function

### Long-term
- [ ] Implement intrusion detection system (IDS)
- [ ] Set up centralized logging
- [ ] Regular security audits

## Conclusion

The server was compromised through a critical Next.js vulnerability, not through the web scraping activity. The Puppeteer scraper simply consumed enough resources to make the server unstable, which exposed the underlying compromise when Hostinger's monitoring detected the DDoS activity.

A second security sweep on December 7 discovered additional malware components that had evaded initial detection, including a persistence mechanism in crontab and a process disguised as a kernel thread.

A third security sweep identified the malware as **"kickd"**, a Go-based DDoS botnet that used fileless execution techniques and respawned via apt package manager hooks. Immutable decoy files were deployed to permanently prevent respawning.

**All malware has now been fully removed.** The server is running with:
- Patched Next.js 16.0.7 (no known vulnerabilities)
- Active UFW firewall (ports 22, 80, 443 only)
- Blocked malicious IPs (38.181.20.122, 103.135.101.15)
- iptables rules persisted via iptables-persistent
- Proper port isolation (3000/3001 blocked externally)
- All malware cron jobs removed
- All malware binaries deleted
- All malware processes killed
- Immutable decoy files blocking malware recreation
- fail2ban active for SSH brute force protection
- 0 npm vulnerabilities (backend and frontend)

The website is fully operational at https://isoeagle.io/

---

*Postmortem prepared: December 6-7, 2025*
*Author: Automated security analysis*
*Last updated: December 7, 2025 04:45 UTC*
