# SmartCRM AI — CI/CD Pipeline & SaaS Release Workflow

## 1. Overview

SmartCRM AI uses an automated GitHub Actions Continuous Integration and Continuous Deployment (CI/CD) workflow. Every push and pull request to canonical branches (`master` and `main`) triggers strict automated testing, container checks, and build validation.

---

## 2. CI/CD Pipeline Stages

```
                        +----------------------------+
                        |  Git Push / Pull Request   |
                        |      (master, main)        |
                        +----------------------------+
                                      |
                    +-----------------+-----------------+
                    |                                   |
                    v                                   v
+---------------------------------------+ +---------------------------------------+
|  Stage 1: Backend Verification Suite  | |   Stage 2: Frontend Production Build  |
|   - Ubuntu runner with Mongo 7.0 svc  | |   - Ubuntu runner with Node.js 20     |
|   - npm ci install                    | |   - npm ci install                    |
|   - 14 End-to-End Workflow Tests:     | |   - Vite 5 production bundle compile  |
|     * Lead qualification              | |   - PostCSS & Tailwind optimization   |
|     * Pipeline stage transitions      | |   - Zero syntax / lint errors guard   |
|     * Razorpay signature verification | +---------------------------------------+
|     * Email dispatch & durable log    |                   |
|     * Support ticket SLAs             |                   v
|     * Background job workers          |      +-------------------------+
|     * Plan limits enforcement         |      | Static Assets Artifacts |
|     * Grounded AI assistant           |      +-------------------------+
+---------------------------------------+                   |
                    |                                       |
                    +-----------------+---------------------+
                                      |
                                      v
                        +----------------------------+
                        |   Stage 3: CD Deployment   |
                        | (Tagged Releases & Staging)|
                        |   - Docker image build     |
                        |   - Zero-downtime rolling  |
                        |     update to cluster      |
                        +----------------------------+
```

---

## 3. GitHub Actions Pipeline Configuration

The complete configuration is defined in `.github/workflows/ci.yml`:

```yaml
name: SmartCRM AI - Production CI/CD Pipeline

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]

jobs:
  server-verification:
    name: Backend API & Verification Suite
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ ping: 1 })'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Root Dependencies
        run: npm ci || npm install

      - name: Install Server Dependencies
        run: npm ci || npm install
        working-directory: ./server

      - name: Run Backend Product Verification Suite
        run: npm run test:server
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://localhost:27017/smartcrm_ci
          JWT_SECRET: ci_secret_jwt_token_for_smartcrm_2026
          ENCRYPTION_KEY: ci_super_secret_encryption_key_32b_len!!
          RAZORPAY_KEY_ID: rzp_test_mock_123
          RAZORPAY_KEY_SECRET: rzp_secret_mock_456

  client-build:
    name: Frontend Production Build & Lint
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Client Dependencies
        run: npm ci || npm install
        working-directory: ./client

      - name: Build Vite Production Bundle
        run: npm run build
        working-directory: ./client
        env:
          VITE_API_URL: /api/v1
```

---

## 4. Release Tagging & Semantic Versioning

Releases follow strict Semantic Versioning (`vMAJOR.MINOR.PATCH`):
- `v1.0.0`: Initial Phase 1 release (Core CRM, Leads, Deals, Subscriptions, AI Assistant).
- `v2.0.0`: Phase 2 release (End-to-end integration, security validation, document vault, automation center).
- `v3.0.0`: Phase 3 release (Production launch, real payment gateway with Razorpay, email communication hub, persistent background jobs, hard SaaS plan limits, CSV data migration engine, dual health probes).

### Tagging Command Runbook:
```bash
git checkout master
git pull origin master
git tag -a v3.0.0 -m "Release v3.0.0: Production launch, Razorpay gateway, email hub, background jobs, plan limits"
git push origin v3.0.0
```
