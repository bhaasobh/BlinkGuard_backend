# BlinkGuard Backend

BlinkGuard is a security-focused backend for detecting phishing, scam, and fraud-risk content in messages, URLs, and images. The platform combines user authentication, encrypted message storage, hybrid risk analysis, and external threat APIs to help identify suspicious communication before users interact with it.

This repository contains the backend service powering BlinkGuard’s message intelligence workflow and API layer.

## Overview

The system is designed to:

- authenticate users with email/password and Google OAuth
- store user messages securely with AES-based encryption
- analyze message text using a hybrid model of:
  - Hugging Face ML inference
  - rule-based psychology scoring
  - URL-based phishing checks
- detect risky links via the Python URL scanner
- support admin/dashboard monitoring endpoints
- provide review and reporting support for suspicious content

## Tech Stack

- Node.js + Express.js
- ES modules
- MongoDB + Mongoose
- JWT-based auth
- Google OAuth / Google APIs
- Python URL scanner with VirusTotal and Google Safe Browsing
- Hugging Face inference for ML classification
- Swagger UI for API docs

## Project Structure

```text
BlinkGuard_backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── swagger.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── scanner/
│   └── url_scanner.py
├── .env.example (optional local setup file)
├── requirements.txt
├── package.json
├── README.md
└── AGENTS.md
```

## Core Features

### 1) User authentication

- manual registration and login
- Google signup/login flow through Google OAuth
- JWT issuance and bearer-token protection for private routes
- user-specific filtering for all authenticated data access

### 2) Encrypted message handling

- message content is encrypted before persistence
- decryption is handled through a shared utility layer
- serialized responses expose decrypted content while keeping encrypted fields hidden

### 3) Risk analysis engine

- text message analysis with a hybrid scoring model
- psychological signal detection for urgency, fear, authority, reward, scarcity, and pressure tactics
- model scoring from Hugging Face
- decision logic that classifies messages as safe, suspicious, or malicious

### 4) URL scanning

- extracts URLs from message content
- runs a Python scanner against each URL
- checks against external threat intelligence sources including:
  - VirusTotal
  - Google Safe Browsing
- heuristic filtering for suspicious domains and patterns

### 5) Dashboard and moderation endpoints

- summary statistics and user metrics
- message and scan listing
- per-message review and monitoring access
- restricted dashboard API-key protection

## API Highlights

### Auth routes

- POST /auth/register
- POST /auth/login
- POST /auth/google

### Message routes

- GET /messages
- POST /messages
- PATCH /messages/classification
- POST /messages/count
- POST /messages/keyinsight

### Scan routes

- POST /scan/text
- POST /scan/raw
- POST /scan/rawtxt
- POST /scan/url
- POST /scan/image
- GET /scan/:scanId

### Dashboard routes

- GET /dashboard/summary
- GET /dashboard/users
- GET /dashboard/messages
- GET /dashboard/scans
- GET /dashboard/messages/:messageId

### Review routes

- POST /reviews/add

### API docs

- Swagger is served at:
  - /api-docs

## Environment Variables

The backend expects the following environment variables in a local .env file:

```env
JWT_SECRET=
MONGO_URI=
# or MONGODB_URI
PORT=3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TOKEN_ENC_KEY=
MESSAGE_ENC_KEY=
HF_MODEL_REPO=
HF_TIMEOUT_MS=
HF_API_TOKEN=
GSB_API_KEY=
VT_API_KEY=
DASHBOARD_API_KEY=
INTERNAL_API_KEY=
```

### Notes

- TOKEN_ENC_KEY and MESSAGE_ENC_KEY should be 64-character hex strings for AES-256-GCM usage.
- MESSAGE_ENC_KEY is preferred for message encryption; the app falls back to TOKEN_ENC_KEY if necessary.
- The backend does not commit secrets to source control and should keep .env locally.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/BlinkGuard_backend.git
cd BlinkGuard_backend
```

2. Install Node dependencies:

```bash
npm install
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

From the project root:

```bash
npm start
```

By default the server runs on port 3000 unless PORT is set.

## Example local run

```bash
npm install
pip install -r requirements.txt
npm start
```

## Scanner Command

The URL scanner is also usable directly:

```bash
python scanner/url_scanner.py "https://example.com"
```

## Security and Data Handling

This backend incorporates several security measures:

- JWT auth for protected endpoints
- encrypted storage for sensitive message content and Google refresh tokens
- ownership checks on user-scoped data
- API key protection for dashboard routes
- centralized control of external API access through configuration

## Production Considerations

This project is structured as a strong prototype/backend foundation and is ready for further hardening in production, including:

- rate limiting
- request validation middleware
- centralized error handling
- health checks and monitoring
- structured logging
- CI/CD pipeline and automated tests

## Project Status

This repository currently includes:

- Express API framework
- MongoDB persistence layer
- authentication and authorization flow
- message ingestion and scanning logic
- URL scanner integration
- dashboard/admin monitoring endpoints
- Swagger documentation

There is no configured JavaScript test suite in the current package.json, so this project is best evaluated by running the backend locally and exercising the API endpoints directly.

## Why this project matters

BlinkGuard is a practical example of a modern threat-detection backend that combines:

- user-centered security workflows
- machine learning-based risk scoring
- deterministic rule-based detection
- external intelligence integrations
- secure storage patterns for sensitive data

This combination makes it a strong demonstration of backend engineering, API design, security awareness, and smart system integration.

## License

This project is intended for demonstration and portfolio use unless otherwise specified by the repository owner.

---

For interview or portfolio presentation, this backend demonstrates a complete end-to-end phishing-risk detection system from authentication to AI-driven scanning, encrypted message handling, and API exposure for real-world use cases.
