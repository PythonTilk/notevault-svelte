# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with NoteVault. Use this guide to quickly identify problems and implement solutions.

## 🚨 Quick Diagnosis

### System Status Check

#### Health Check Commands
```bash
# Check application health
curl -f http://localhost:3001/health || echo "Application is down"

# Check database connectivity
npm run db:check || echo "Database connection failed"

# Check Redis connectivity
redis-cli ping || echo "Redis is down"

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node
```

#### Common Status Indicators
```
🟢 Healthy: All services responding normally
🟡 Warning: Some degraded performance or non-critical issues
🔴 Critical: Major functionality broken or services down
⚫ Unknown: Unable to determine status
```

### Error Categories

#### Application Errors
- **Startup Issues**: Application won't start or crashes immediately
- **Runtime Errors**: Application runs but features don't work
- **Performance Issues**: Slow response times or timeouts
- **Authentication Problems**: Login/logout issues
- **Data Sync Issues**: Real-time collaboration problems

#### Infrastructure Errors
- **Database Connectivity**: Can't connect to database
- **Redis Issues**: Cache or session problems
- **Network Problems**: API calls failing
- **File System Issues**: File upload/download problems
- **SSL/Certificate Issues**: HTTPS problems

## 🔧 Common Issues & Solutions

### Application Won't Start

#### Issue: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**
```bash
# Find process using port 3001
sudo lsof -i :3001
# or
sudo netstat -tulpn | grep :3001

# Kill the process
sudo kill -9 <PID>

# Change port in environment
export PORT=3002
npm start
```

#### Issue: Missing Environment Variables
```
Error: JWT_SECRET is required
```

**Solutions:**
```bash
# Check environment variables
env | grep -E "(JWT_SECRET|DATABASE_URL|NODE_ENV)"

# Copy example environment file
cp .env.example .env.local

# Set required variables
export JWT_SECRET="your-secret-key"
export DATABASE_URL="your-database-url"
```

#### Issue: Database Connection Failed
```
Error: getaddrinfo ENOTFOUND localhost
```

**Solutions:**
```bash
# Check database status
sudo systemctl status postgresql
# or for Docker
docker ps | grep postgres

# Test manual connection
psql -h localhost -U notevault -d notevault

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database
```

### Performance Issues

#### Issue: Slow Page Loading
**Symptoms:**
- Pages take >5 seconds to load
- Users report sluggish interface
- High server response times

**Diagnosis:**
```bash
# Check server resources
top
htop
iotop

# Check database performance
# PostgreSQL
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check slow queries
EXPLAIN ANALYZE SELECT * FROM notes WHERE workspace_id = 'xxx';

# Check cache hit rates
redis-cli info stats
```

**Solutions:**
```bash
# Restart application
pm2 restart notevault-app

# Clear cache
redis-cli FLUSHALL

# Optimize database
VACUUM ANALYZE;
REINDEX DATABASE notevault;

# Check for memory leaks
node --inspect build/index.js
```

#### Issue: High Memory Usage
**Symptoms:**
- Server running out of memory
- Application crashes with OOM errors
- Swap usage increasing

**Diagnosis:**
```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# Check Node.js memory usage
node -e "console.log(process.memoryUsage())"

# Monitor memory over time
while true; do
  free -h
  sleep 5
done
```

**Solutions:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 build/index.js

# Enable garbage collection logging
node --trace-gc build/index.js

# Restart application
pm2 restart notevault-app

# Add swap space (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Authentication Issues

#### Issue: Unable to Login
**Symptoms:**
- Login form shows "Invalid credentials"
- Users can't access their accounts
- Authentication tokens rejected

**Diagnosis:**
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Test database user lookup
psql -d notevault -c "SELECT id, email FROM users WHERE email = 'user@example.com';"

# Check password hash
node -e "
const bcrypt = require('bcrypt');
console.log(bcrypt.compareSync('password', 'hash-from-db'));
"

# Check logs for auth errors
tail -f logs/combined.log | grep -i auth
```

**Solutions:**
```bash
# Reset user password
npm run reset-password user@example.com

# Regenerate JWT secret (will log out all users)
export JWT_SECRET=$(openssl rand -hex 32)

# Clear user sessions
redis-cli DEL "sess:*"

# Check email verification status
psql -d notevault -c "UPDATE users SET email_verified = true WHERE email = 'user@example.com';"
```

#### Issue: Session Expires Too Quickly
**Symptoms:**
- Users logged out frequently
- "Session expired" messages
- Authentication required repeatedly

**Solutions:**
```javascript
// Increase session timeout in config
{
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    rolling: true // Reset timeout on activity
  }
}
```

### Real-time Collaboration Issues

#### Issue: Live Updates Not Working
**Symptoms:**
- Changes don't appear for other users
- Cursors not showing
- Offline indicators for online users

**Diagnosis:**
```bash
# Check WebSocket connections
ss -tulpn | grep :3001

# Test WebSocket manually
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => console.log('Connected'));
ws.on('error', (err) => console.error('Error:', err));
"

# Check Socket.IO logs
tail -f logs/combined.log | grep -i socket

# Monitor active connections
redis-cli MONITOR | grep socket
```

**Solutions:**
```bash
# Restart application to reset connections
pm2 restart notevault-app

# Check firewall settings
sudo ufw status
sudo iptables -L

# Verify proxy configuration (if using nginx)
nginx -t
sudo nginx -s reload

# Clear Redis connection cache
redis-cli DEL "*socket*"
```

### Database Issues

#### Issue: Database Connection Pool Exhausted
**Symptoms:**
- "Too many connections" errors
- Timeouts on database operations
- Application hangs

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limits
SHOW max_connections;

-- Show current connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**Solutions:**
```javascript
// Adjust connection pool settings
{
  pool: {
    min: 2,
    max: 10, // Reduce if hitting limits
    idle: 10000,
    acquire: 30000,
    evict: 1000
  }
}
```

```bash
# Restart database connections
pm2 restart notevault-app

# Kill hanging connections
psql -d notevault -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

#### Issue: Slow Database Queries
**Symptoms:**
- API endpoints timing out
- Users report slow loading
- High database CPU usage

**Diagnosis:**
```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM notes WHERE workspace_id = 'xxx';
```

**Solutions:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_notes_workspace_updated 
ON notes(workspace_id, updated_at DESC);

-- Update table statistics
ANALYZE notes;

-- Vacuum tables
VACUUM ANALYZE notes;
```

### File Upload Issues

#### Issue: File Uploads Failing
**Symptoms:**
- "Upload failed" errors
- Large files timing out
- File corruption

**Diagnosis:**
```bash
# Check disk space
df -h

# Check file permissions
ls -la uploads/

# Check upload limits
grep -r "client_max_body_size" /etc/nginx/
grep -r "MAX_FILE_SIZE" .env*

# Test manual upload
curl -F "file=@test.txt" http://localhost:3001/api/files/upload
```

**Solutions:**
```bash
# Fix permissions
sudo chown -R notevault:notevault uploads/
chmod 755 uploads/

# Increase upload limits
# In nginx.conf
client_max_body_size 100M;

# In application
export MAX_FILE_SIZE="104857600" # 100MB

# Clear upload temp files
find /tmp -name "upload_*" -mtime +1 -delete
```

### SSL/HTTPS Issues

#### Issue: SSL Certificate Errors
**Symptoms:**
- "Certificate not trusted" warnings
- HTTPS not working
- Mixed content errors

**Diagnosis:**
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/domain.com/fullchain.pem -text -noout

# Test SSL configuration
curl -I https://yourdomain.com

# Check certificate expiration
certbot certificates

# Test SSL quality
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Force certificate renewal
sudo certbot renew --force-renewal

# Test nginx configuration
sudo nginx -t

# Reload nginx with new certificates
sudo nginx -s reload
```

## 🔍 Debugging Tools

### Application Debugging

#### Node.js Debugging
```bash
# Enable debug mode
DEBUG=* npm start

# Use Node.js inspector
node --inspect build/index.js

# Debug with VS Code
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug NoteVault",
  "program": "${workspaceFolder}/build/index.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Database Debugging
```sql
-- Enable query logging (PostgreSQL)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Monitor queries in real-time
tail -f /var/log/postgresql/postgresql-*.log

-- Check locks and blocking queries
SELECT * FROM pg_locks l 
JOIN pg_stat_activity a ON l.pid = a.pid 
WHERE NOT l.granted;
```

#### Redis Debugging
```bash
# Monitor Redis commands
redis-cli MONITOR

# Check Redis info
redis-cli INFO

# List all keys
redis-cli KEYS "*"

# Check memory usage
redis-cli INFO memory
```

### Log Analysis

#### Structured Log Analysis
```bash
# Search for errors in last hour
journalctl -u notevault-app --since "1 hour ago" | grep -i error

# Count error types
cat logs/combined.log | jq -r '.level' | sort | uniq -c

# Find slow requests
cat logs/combined.log | jq 'select(.duration > 1000)' | head -10

# Monitor logs in real-time
tail -f logs/combined.log | jq 'select(.level == "error")'
```

#### Performance Analysis
```bash
# Analyze response times
cat logs/combined.log | jq -r '.duration' | awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'

# Find most frequent endpoints
cat logs/combined.log | jq -r '.url' | sort | uniq -c | sort -nr | head -10

# Memory usage over time
cat logs/combined.log | jq -r 'select(.memory) | "\(.timestamp) \(.memory.heapUsed)"'
```

## 📊 Monitoring & Alerting

### Health Monitoring Setup

#### Basic Health Checks
```bash
#!/bin/bash
# health-monitor.sh

check_service() {
  service=$1
  if systemctl is-active --quiet $service; then
    echo "✅ $service is running"
  else
    echo "❌ $service is down"
    systemctl restart $service
  fi
}

# Check critical services
check_service postgresql
check_service redis-server
check_service nginx

# Check application
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ NoteVault application is healthy"
else
  echo "❌ NoteVault application is down"
  pm2 restart notevault-app
fi

# Check disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
  echo "⚠️ Disk usage is $disk_usage%"
fi

# Check memory usage
mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $mem_usage -gt 80 ]; then
  echo "⚠️ Memory usage is $mem_usage%"
fi
```

#### Advanced Monitoring
```javascript
// monitoring.js
const os = require('os');
const fs = require('fs');

class SystemMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }

  collectMetrics() {
    const metrics = {
      timestamp: new Date(),
      cpu: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100
      },
      uptime: os.uptime(),
      processes: process.memoryUsage()
    };

    this.checkThresholds(metrics);
    return metrics;
  }

  checkThresholds(metrics) {
    // Memory threshold
    if (metrics.memory.usage > 85) {
      this.createAlert('HIGH_MEMORY_USAGE', `Memory usage: ${metrics.memory.usage.toFixed(2)}%`);
    }

    // CPU threshold
    if (metrics.cpu[0] > 2) {
      this.createAlert('HIGH_CPU_LOAD', `CPU load: ${metrics.cpu[0]}`);
    }

    // Process memory threshold
    if (metrics.processes.heapUsed > 1024 * 1024 * 1024) { // 1GB
      this.createAlert('HIGH_PROCESS_MEMORY', `Process heap: ${(metrics.processes.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  createAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date(),
      severity: this.getSeverity(type)
    };

    this.alerts.push(alert);
    console.warn(`🚨 ALERT [${alert.severity}]: ${alert.message}`);

    // Send notification (email, Slack, etc.)
    this.sendNotification(alert);
  }

  getSeverity(type) {
    const severityMap = {
      HIGH_MEMORY_USAGE: 'WARNING',
      HIGH_CPU_LOAD: 'WARNING',
      HIGH_PROCESS_MEMORY: 'CRITICAL'
    };
    return severityMap[type] || 'INFO';
  }

  sendNotification(alert) {
    // Implement notification logic
    // Email, Slack, PagerDuty, etc.
  }
}

// Start monitoring
const monitor = new SystemMonitor();
setInterval(() => {
  monitor.collectMetrics();
}, 30000); // Every 30 seconds
```

## 📋 Troubleshooting Checklist

### When Issues Occur

#### Immediate Response (0-5 minutes)
- [ ] Check application health endpoint
- [ ] Verify critical services are running
- [ ] Check recent error logs
- [ ] Confirm database connectivity
- [ ] Verify user reports and scope of issue

#### Short-term Response (5-30 minutes)
- [ ] Identify root cause from logs
- [ ] Check system resources (CPU, memory, disk)
- [ ] Review recent deployments or changes
- [ ] Implement immediate fixes or workarounds
- [ ] Communicate status to users

#### Medium-term Response (30 minutes - 2 hours)
- [ ] Implement permanent fix
- [ ] Test fix in staging environment
- [ ] Deploy fix to production
- [ ] Monitor for resolution
- [ ] Update documentation

#### Post-incident (2+ hours)
- [ ] Document incident and resolution
- [ ] Conduct post-mortem analysis
- [ ] Identify prevention measures
- [ ] Update monitoring and alerting
- [ ] Share learnings with team

### Prevention Checklist

#### Monitoring
- [ ] Health checks configured
- [ ] Error tracking active
- [ ] Performance monitoring enabled
- [ ] Log aggregation working
- [ ] Alerting rules defined

#### Infrastructure
- [ ] Backup systems tested
- [ ] Failover procedures documented
- [ ] Capacity planning current
- [ ] Security updates applied
- [ ] Dependencies up to date

#### Processes
- [ ] Incident response plan current
- [ ] Team contact information updated
- [ ] Escalation procedures clear
- [ ] Change management process followed
- [ ] Documentation maintained

## 🆘 Getting Help

### Internal Resources

#### Log Files
```bash
# Application logs
tail -f logs/combined.log
tail -f logs/error.log

# System logs
sudo journalctl -u notevault-app -f
sudo journalctl -u postgresql -f
sudo journalctl -u nginx -f

# PM2 logs
pm2 logs notevault-app
```

#### Diagnostic Commands
```bash
# Generate diagnostic report
cat > diagnostic-report.sh << 'EOF'
#!/bin/bash
echo "=== System Information ==="
uname -a
uptime
free -h
df -h

echo "=== Service Status ==="
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
pm2 status

echo "=== Application Health ==="
curl -s http://localhost:3001/health | jq .

echo "=== Recent Errors ==="
tail -50 logs/error.log

echo "=== Database Status ==="
psql -d notevault -c "SELECT version();"
psql -d notevault -c "SELECT count(*) FROM users;"

echo "=== Redis Status ==="
redis-cli info server
redis-cli info memory
EOF

chmod +x diagnostic-report.sh
./diagnostic-report.sh > diagnostic-$(date +%Y%m%d-%H%M%S).txt
```

### External Support

#### Community Resources
- **GitHub Issues**: Report bugs and feature requests
- **Community Forum**: Ask questions and share solutions
- **Documentation**: Search comprehensive guides
- **Video Tutorials**: Step-by-step troubleshooting

#### Professional Support
- **Email Support**: technical-support@notevault.com
- **Priority Support**: For enterprise customers
- **Emergency Hotline**: Critical production issues
- **Custom Consulting**: Architecture and optimization

#### Useful Information to Include
When seeking help, provide:
- **Error messages**: Exact error text and stack traces
- **Environment details**: OS, Node.js version, deployment type
- **Steps to reproduce**: What actions trigger the issue
- **Recent changes**: Deployments, configuration changes
- **Log excerpts**: Relevant log entries around the issue
- **System metrics**: CPU, memory, disk usage during issue

---

## Quick Reference

### Emergency Commands
```bash
# Restart everything
sudo systemctl restart postgresql redis-server nginx
pm2 restart all

# Clear all caches
redis-cli FLUSHALL
npm run cache:clear

# Check all services
systemctl status postgresql redis-server nginx
pm2 status

# View real-time logs
tail -f logs/combined.log logs/error.log

# Emergency disk cleanup
docker system prune -af
npm cache clean --force
find /tmp -type f -mtime +7 -delete
```

### Contact Information
- **Emergency**: +1-800-NOTEVAULT
- **Support Email**: support@notevault.com
- **Technical Email**: technical@notevault.com
- **Security Email**: security@notevault.com

---

*Last Updated: August 15, 2025*  
*Troubleshooting Version: 1.2.0*  
*Next Review: November 15, 2025*