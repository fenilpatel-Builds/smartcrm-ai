# SmartCRM AI — Production Deployment & Operations Guide

## Executive Summary

SmartCRM AI is an enterprise-grade, multi-tenant Customer Relationship Management (CRM) and Subscription Management SaaS platform built on the MERN stack (MongoDB, Express.js, React 18 / Vite, Node.js). This guide details the complete deployment architecture, environment configurations, container orchestration, reverse proxy setup, SSL/TLS configuration, horizontal scaling strategy, and operations runbook for production environments.

---

## 1. System Architecture Overview

```
                        +----------------------------+
                        |  Internet Clients (Users)  |
                        +----------------------------+
                                      |
                                      v HTTPS (443)
                        +----------------------------+
                        |    Cloudflare / CDN WAF    |
                        +----------------------------+
                                      |
                                      v Reverse Proxy (SSL Terminated)
                        +----------------------------+
                        |     Nginx 1.25 / Envoy     |
                        | (Gzip, Rate Limit, Headers)|
                        +----------------------------+
                               /              \
             /api/v1/*        /                \  Static Assets /*
                             v                  v
         +--------------------------+    +--------------------------+
         | Express Node.js Cluster  |    | Production SPA Assets    |
         | (PM2 / Kubernetes Pods)  |    | (Vite / Nginx Static)    |
         | Port 5000                |    +--------------------------+
         +--------------------------+
            |          |           |
            v          v           v
    +-----------+ +-----------+ +---------------+
    | MongoDB   | | Razorpay  | | SMTP Service  |
    | Replica   | | Stripe    | | (SES/Resend)  |
    | Set 7.0   | | Webhooks  | | Outbound Logs |
    +-----------+ +-----------+ +---------------+
```

---

## 2. Infrastructure Requirements

### Minimum Recommended Specs (Production)
| Tier | VCPU | RAM | Storage | Suitable For |
| :--- | :--- | :--- | :--- | :--- |
| **App Node (x2)** | 2 Core | 4 GB | 50 GB NVMe | Up to 100,000 monthly active requests |
| **MongoDB Cluster** | 2 Core | 8 GB | 100 GB NVMe (RAID-10) | Primary + Secondary + Arbiter Replica Set |
| **Background Worker** | 1 Core | 2 GB | 25 GB NVMe | Dedicated job worker node (if separated) |

---

## 3. Environment Variables Specification

Create `.env` in the `server/` root:

```ini
# Environment
NODE_ENV=production
PORT=5000

# Client Application URL (For CORS and redirect links)
CLIENT_URL=https://crm.yourdomain.com

# Database Connection (Replica set with SSL enabled in production)
MONGODB_URI=mongodb+srv://smartcrm_prod_user:<PASSWORD>@cluster0.mongodb.net/smartcrm_prod?retryWrites=true&w=majority

# Authentication Secrets
JWT_SECRET=super_high_entropy_random_hex_key_at_least_64_chars_long_2026
JWT_EXPIRES_IN=7d

# Cryptographic Master Key for Document Vault (AES-256-GCM - exactly 32 bytes)
ENCRYPTION_KEY=12345678901234567890123456789012

# Payment Gateway Keys (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=whsec_zzzzzzzzzzzzzzzzzzzz

# Outbound Email (SMTP or Provider)
EMAIL_PROVIDER=smtp
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
FROM_EMAIL=notifications@yourdomain.com
FROM_NAME=SmartCRM Cloud

# Rate Limiting & Performance
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

Frontend `.env.production` in `client/`:

```ini
VITE_API_URL=/api/v1
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
```

---

## 4. Docker & Containerized Deployment

### 4.1 Production Dockerfile (Backend)
Located in `server/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "server.js"]
```

### 4.2 Production Dockerfile (Frontend)
Located in `client/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 Docker Compose Production Stack
```yaml
version: '3.8'

services:
  app:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/smartcrm_prod
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - internal_net

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    networks:
      - internal_net

  mongo:
    image: mongo:7.0
    restart: always
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand({ ping: 1 })"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal_net

volumes:
  mongo_data:

networks:
  internal_net:
    driver: bridge
```

---

## 5. Nginx Production Configuration

```nginx
server {
    listen 80;
    server_name crm.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SPA Client Route
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Health & Readiness Probes
    location ~ ^/(health|ready) {
        proxy_pass http://127.0.0.1:5000;
        access_log off;
    }
}
```

---

## 6. PM2 Cluster Mode (Native Linux Deployment)

For bare metal or VM deployments, use PM2 cluster mode:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'smartcrm-api',
      script: './server/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

---

## 7. Health, Readiness & Liveness Probes

The system provides dual enterprise health probes:

- **`GET /health`**: Process liveness probe. Verifies application is running, returns process uptime and correlation ID.
- **`GET /ready`**: Traffic readiness probe. Verifies Mongoose connection state is `1` (connected). Returns HTTP 200 when ready, HTTP 503 if MongoDB is disconnected.
