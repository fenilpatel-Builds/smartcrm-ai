# SmartCRM AI — Production Deployment Guide

## 1. System Requirements
- Node.js 20.x LTS or higher
- MongoDB 7.x
- Memory: Minimum 2GB RAM (4GB recommended)
- Disk: Minimum 10GB persistent storage (for Document Vault and MongoDB data)

---

## 2. Environment Configuration

### Backend (`server/.env`)
```ini
PORT=5001
NODE_ENV=production
CLIENT_URL=https://your-domain.com
MONGODB_URI=mongodb://127.0.0.1:27017/smartcrm
JWT_SECRET=your_super_secure_production_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key_optional
OPENAI_API_KEY=your_openai_api_key_optional
```

### Frontend (`client/.env`)
```ini
VITE_API_URL=https://api.your-domain.com/api/v1
```

---

## 3. Installation & Build Steps

1. **Clone repository:**
   ```bash
   git clone https://github.com/fenilpatel-Builds/smartcrm-ai.git
   cd smartcrm-ai
   ```

2. **Install Root, Server, and Client Dependencies:**
   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. **Database Seeding (Optional for initial setup):**
   ```bash
   npm run seed --prefix server
   ```

4. **Run Automated Tests:**
   ```bash
   npm run test:server
   ```

5. **Build Production Frontend:**
   ```bash
   npm run build:client
   ```
   The production-ready assets will be compiled into `client/dist`.

---

## 4. Production Process Management (PM2)

```bash
# Start backend server
pm2 start server/server.js --name "smartcrm-backend" -i max

# Serve frontend via NGINX or PM2 serve
pm2 serve client/dist 5173 --name "smartcrm-frontend" --spa
```
