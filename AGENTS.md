# AGENTS.md

## Quick Start

This is the BlinkGuard backend: an Express 4 API using ES modules, MongoDB via Mongoose, JWT auth, Google OAuth token exchange, encrypted message storage, Hugging Face/remote ML analysis, and a Python URL scanner.

Run from repository root:

```bash
npm install
pip install -r requirements.txt
npm start
```

The only npm script currently defined is:

```bash
npm start
```

Server entrypoint: `src/server.js`
Express app setup: `src/app.js`
Default port: `3000` unless `PORT` is set.

Required environment variables used by the code:

```env
JWT_SECRET=
MONGO_URI=              # or MONGODB_URI
PORT=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TOKEN_ENC_KEY=          # 64-character hex key
MESSAGE_ENC_KEY=        # optional; falls back to TOKEN_ENC_KEY
HF_MODEL_REPO=
HF_TIMEOUT_MS=
HF_API_TOKEN=
GSB_API_KEY=            # used by scanner/url_scanner.py
VT_API_KEY=             # used by scanner/url_scanner.py
```

`.env` is loaded from the backend root by `src/server.js`.

## Project Structure

```text
src/
  app.js                    Express app, JSON middleware, route mounting, Swagger UI
  server.js                 dotenv loading, MongoDB connection, HTTP listen
  swagger.js                swagger-jsdoc config

  routes/
    auth.routes.js          /auth/register, /auth/login, /auth/google
    message.routes.js       /messages endpoints
    scan.routes.js          /scan endpoints and Swagger route docs

  controllers/
    auth.controller.js      manual auth, Google auth, JWT issuing
    message.controller.js   message create/list/count logic
    scan.controller.js      text scans, raw scans, URL scans, combined analysis

  middleware/
    auth.middleware.js      Bearer JWT verification

  models/
    User.js
    ManualAuth.js
    GoogleAuth.js
    SocialAuth.js
    Message.js
    ScanResult.js
    Url.js
    AIModel.js
    ModelRetrainingJob.js
    UserFeedback.js
    Job.js                 currently empty

  services/
    scan.service.js         Node wrapper around Python URL scanner
    ai/
      ai.service.js         Hugging Face inference + psychology scoring
      psychologyRules.js    local rule-based psychology analysis

  utils/
    messageEncryption.js    AES-256-GCM message encryption/decryption/serialization

scanner/
  url_scanner.py            VirusTotal, Google Safe Browsing, URL heuristics
requirements.txt            Python deps: requests, python-Levenshtein
```

Ignore `Open Notebook.onetoc2` files; they are not part of the backend architecture.

## Common Commands

```bash
npm install
npm start
pip install -r requirements.txt
python scanner/url_scanner.py "https://example.com"
```

There is no configured test, lint, build, or dev script in `package.json`.

## Architecture

The app uses a conventional Express layering:

- `src/app.js` creates the Express app, enables `express.json()`, mounts routes, and serves Swagger at `/api-docs`.
- `src/server.js` loads `.env`, connects Mongoose to `MONGODB_URI` or `MONGO_URI`, then starts the server.
- `routes/*.routes.js` define HTTP endpoints and connect them to controller functions.
- `controllers/*.controller.js` handle request validation, model calls, service calls, and responses.
- `models/*.js` define Mongoose schemas.
- `services/*` contain integrations and reusable business logic.
- `utils/messageEncryption.js` handles encryption/decryption and safe message serialization.
- `middleware/auth.middleware.js` protects authenticated routes.

Current mounted route prefixes:

```text
/auth
/messages
/scan
/analyze
/api-docs
```

Note: `/analyze` currently mounts the same router as `/scan`, so scan routes are also reachable under `/analyze`.

## Database Models

Mongoose is the only database layer.

### User

`User` stores profile/device data:

- `user_id`: UUID string, unique, indexed
- `email`: unique, lowercase, trimmed
- `display_name`: required
- `country`
- `device_id`
- `fcm_token`
- timestamps

### ManualAuth

Stores password auth separately from `User`:

- `user_id`: unique, indexed
- `password_hash`
- timestamps

Passwords are hashed with `bcrypt.hash(password, 10)`.

### GoogleAuth

Stores Google OAuth token data:

- `user_id`: unique
- `refresh_token_enc`: encrypted refresh token
- `access_token`
- `expiry_date`
- timestamps

Refresh tokens are encrypted with AES-256-GCM using `TOKEN_ENC_KEY`.

### Message

Stores user messages:

- `messageId`: UUID string, unique, indexed
- `userId`: string user id, indexed
- `sourceType`
- `content`
- `contentIv`
- `contentAuthTag`
- `scanResult`: ObjectId ref to `ScanResult`
- timestamps

Normal message creation encrypts `content` through `encryptMessageContent()`. Use `serializeMessage()` before returning messages so encrypted fields are removed and content is decrypted.

### ScanResult

Stores analysis output:

- `scanId`: UUID string, unique, indexed
- `messageId`: string, indexed
- `riskLevel`: `LOW`, `MEDIUM`, `HIGH`
- `scanType`: `TEXT`, `URL`, `IMAGE`, `AUTOMATED`, `TEXT_URL`
- `urlStatus`: `SAFE`, `SUSPICIOUS`, `MALICIOUS`
- `confidenceScore`, `psychologyRiskScore`, `mlRiskScore`
- `psychologicalFactors`
- `mlPrediction`
- `decision`
- `analysisVersion`
- `explanations`
- `rawModelOutput`
- timestamps

### Other Models

- `Url`: tracks original/expanded URLs by `message_id`; unique compound index on `message_id + original_url`.
- `SocialAuth`: generic social login links; unique indexes prevent duplicate provider links.
- `AIModel`: model metadata and metrics; unique `modelName + version`.
- `ModelRetrainingJob`: retraining job status timestamps.
- `UserFeedback`: user reports and retraining flag.
- `Job.js`: currently empty; do not assume behavior exists there.

## Authentication Flow

Manual auth:

1. `POST /auth/register`
2. Creates a `User` with `crypto.randomUUID()` as `user_id`.
3. Hashes password with bcrypt.
4. Stores hash in `ManualAuth`.
5. `POST /auth/login`
6. Looks up `User` by email.
7. Loads `ManualAuth` by `user_id`.
8. Compares password with bcrypt.
9. Signs JWT with payload `{ userId: user.user_id }`, `JWT_SECRET`, and `expiresIn: "1d"`.

Google auth:

1. `POST /auth/google`
2. Requires `serverAuthCode`.
3. Exchanges code with Google OAuth client using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Requires a Google `refresh_token`.
5. Finds or creates `User` by email.
6. Encrypts refresh token with `TOKEN_ENC_KEY`.
7. Upserts `GoogleAuth`.
8. Issues the same app JWT shape as manual login.

Protected endpoints use `auth.middleware.js`:

```js
Authorization: Bearer <jwt>
```

The middleware verifies the token with `JWT_SECRET` and assigns the decoded payload to `req.user`.

## Current Endpoints

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/google
```

### Messages

All message routes use JWT auth.

```text
GET  /messages
POST /messages
POST /messages/count
```

`POST /messages` requires `sourceType` and `content`.

### Scan

```text
POST /scan/text       auth required; scans an existing message by messageId
POST /scan/raw        auth required; creates encrypted message and scans content
POST /scan/rawtxt     auth required; combined text + URL analysis
GET  /scan/:scanId    auth required
POST /scan/url        no auth currently; scans a URL with Python scanner
```

`GET /scan/:scanId` is registered twice in `scan.routes.js`; avoid duplicating route registrations further.

## AI and Scanner Integrations

### Hugging Face Inference

`src/services/ai/ai.service.js` calls:

```text
https://router.huggingface.co/hf-inference/models/${HF_MODEL_REPO}
```

Default model repo is `bahaasobeh/blinkguard`.

`HF_API_TOKEN` is optional in code, but should be set for authenticated inference. `HF_TIMEOUT_MS` defaults to `8000`.

`analyzeMessage()` combines:

- ML model score, weighted 55%
- local psychology rule score, weighted 45%
- extra boosts for risky factor combinations

It returns normalized backend fields such as `riskLevel`, `decision`, `confidenceScore`, `psychologyRiskScore`, `mlRiskScore`, `mlPrediction`, `explanations`, and `rawModelOutput`.

### Psychology Rules

`src/services/ai/psychologyRules.js` detects:

- urgency
- authority
- fear
- reward
- scarcity
- curiosity
- link presence
- money mention
- contact pressure
- formatting pressure

Keep these rules simple and deterministic unless changing the scoring contract intentionally.

### Remote Analyze Endpoint

`scan.controller.js` also calls:

```text
https://blinkguardbackendmasanalyze-production.up.railway.app/analyze
```

This is used by `analyzeTxt()` for combined content analysis. It then extracts URLs, scans each URL, combines URL score with text score, optionally stores phishing results, and returns a normalized response.

### Python URL Scanner

`src/services/scan.service.js` runs:

```bash
python scanner/url_scanner.py <url>
```

The Python scanner uses:

- VirusTotal API via `VT_API_KEY`
- Google Safe Browsing via `GSB_API_KEY`
- local URL heuristics
- `requests`
- `python-Levenshtein`

It prints JSON to stdout. Keep this contract intact because Node parses stdout with `JSON.parse()`.

## Coding Rules

- Use ES modules: `import` / `export`.
- Keep route definitions in `src/routes`.
- Keep HTTP request/response handling in controllers.
- Put reusable integrations or domain logic in `src/services`.
- Put shared serialization/encryption helpers in `src/utils`.
- Use Mongoose models from `src/models`; do not define schemas inside controllers.
- Generate public IDs with `crypto.randomUUID()` to match existing `user_id`, `messageId`, and `scanId` patterns.
- Return JSON errors in the existing shape: `{ error: "message" }`.
- Use `try/catch` in async controllers and return appropriate HTTP status codes.
- For protected user data, always filter by `req.user.userId`.
- When returning messages, use `serializeMessage()` so encrypted fields are not exposed.
- Follow existing naming even where mixed:
  - user model uses `user_id`
  - message model uses `userId`
  - message public id uses `messageId`
  - scan public id uses `scanId`
- Keep Swagger route docs in the route files when adding documented endpoints.
- Do not introduce a new framework or folder pattern unless the existing structure cannot support the feature.

## Security Rules

- Never commit `.env` or secrets.
- `JWT_SECRET` is required for login and protected routes.
- `TOKEN_ENC_KEY` and `MESSAGE_ENC_KEY` must be 64-character hex strings for AES-256-GCM.
- Prefer `MESSAGE_ENC_KEY` for message content; code falls back to `TOKEN_ENC_KEY`.
- Do not return `password_hash`, refresh tokens, encryption IVs, or auth tags in API responses.
- Do not log secrets or full tokens.
- `src/server.js` currently logs the Mongo URI; avoid expanding secret logging and consider this file sensitive.
- Passwords must stay in `ManualAuth`, not `User`.
- Google refresh tokens must remain encrypted before persistence.
- Add `auth` middleware to routes that read or write user-specific data.
- For authenticated reads, verify ownership by querying with both resource id and `req.user.userId` where possible.
- Validate required request fields before calling models or external services.
- Be careful with `POST /scan/url`; it is currently unauthenticated and shells out to Python through `execFile`.

## Error Handling and Validation

There is no centralized error middleware. Controllers currently handle errors locally.

Current patterns:

- Missing required fields return `400`.
- Auth failures return `401`.
- Missing resources return `404`.
- Unexpected failures return `500`.
- Errors are returned as `{ error: err.message }` or a fixed `{ error: "Server error" }`.

Validation is manual inside controllers and Mongoose schemas. There is no Joi/Zod/express-validator setup.

When adding validation:

- Keep it close to the controller unless a reusable validator already exists.
- Match existing response format.
- Do not add broad validation frameworks for a single endpoint.

## How To Add Features

### Add a New Endpoint

1. Add or update a controller function in `src/controllers`.
2. Reuse existing services/models instead of duplicating logic.
3. Add the route in the relevant file under `src/routes`.
4. Add `auth` middleware if the endpoint accesses user data.
5. Mount a new router in `src/app.js` only if it is a new resource area.
6. Add Swagger docs in the route file if the endpoint is public API.
7. Return JSON using existing status/error conventions.

### Add Message-Related Logic

- Use `Message` from `src/models/Message.js`.
- Encrypt new message content with `encryptMessageContent()`.
- Decrypt only through `decryptMessageContent()` or `serializeMessage()`.
- Preserve `messageId` as the public message identifier.
- Link scan results with `message.scanResult = scan._id`.

### Add Scan or AI Logic

- Put reusable analysis logic in `src/services/ai`.
- Keep controller response shaping in `scan.controller.js`.
- Preserve `ScanResult` enum values unless updating the schema intentionally.
- Store raw third-party output in `rawModelOutput` when useful for debugging.
- Keep timeout handling around remote ML calls.

### Add URL Scanning Logic

- If changing Python scanner output, update `src/services/scan.service.js` and all consumers.
- Keep scanner stdout valid JSON only; extra prints will break Node parsing.
- Add Python dependencies to `requirements.txt`.

### Add Database Fields

- Update the relevant Mongoose schema.
- Check all create/update code paths for required field impact.
- Check serializers before exposing new fields.
- Use indexes only for fields used in lookups or uniqueness constraints.

## Important Files

- `src/server.js`: environment loading, Mongo connection, app listen.
- `src/app.js`: route mounting and global middleware.
- `src/middleware/auth.middleware.js`: JWT verification contract.
- `src/controllers/auth.controller.js`: manual auth, Google auth, token creation.
- `src/controllers/scan.controller.js`: core scan workflows and persistence.
- `src/controllers/message.controller.js`: message create/list/count behavior.
- `src/utils/messageEncryption.js`: encryption contract for message content.
- `src/services/ai/ai.service.js`: Hugging Face integration and hybrid scoring.
- `src/services/ai/psychologyRules.js`: local rule-based scoring.
- `src/services/scan.service.js`: Node-to-Python scanner bridge.
- `scanner/url_scanner.py`: VirusTotal, Safe Browsing, and URL heuristic implementation.
- `src/models/*.js`: database shape and relationships.
- `src/swagger.js`: OpenAPI setup.
- `package.json`: real npm scripts and dependencies.

## Things To Avoid

- Do not invent tests, scripts, folders, or build tooling that are not present.
- Do not move business logic into routes.
- Do not duplicate encryption, JWT, scan, or external API logic.
- Do not return encrypted message fields directly.
- Do not store plaintext passwords or Google refresh tokens.
- Do not add large refactors while implementing a narrow feature.
- Do not change public id fields casually; clients likely depend on `user_id`, `messageId`, and `scanId`.
- Do not assume `Job.js` has behavior; it is empty.
- Do not rely on `src/config/db.js`; it is currently empty and connection logic lives in `src/server.js`.
- Do not add noisy stdout to `scanner/url_scanner.py`; Node expects parseable JSON.
- Do not add duplicate route registrations like the existing duplicate `GET /scan/:scanId`.

## Testing Setup

No JavaScript test framework is configured. No test files were detected. No `npm test` script exists.

Before finishing backend changes, at minimum run:

```bash
npm start
```

For scanner changes, run:

```bash
python scanner/url_scanner.py "https://example.com"
```

If adding tests, first add the script and dependencies explicitly in `package.json`, and keep the setup small and consistent with the current Express/Mongoose stack.

## AI Agent Workflow

1. Inspect `package.json`, `src/app.js`, and the relevant route/controller/model before editing.
2. Identify whether the change belongs in routes, controllers, services, models, middleware, or utils.
3. Reuse existing helpers:
   - `auth` for protected routes
   - `encryptMessageContent()`
   - `decryptMessageContent()`
   - `serializeMessage()`
   - `analyzeMessage()`
   - `scanUrl()`
4. Preserve current response shapes and status-code conventions.
5. Keep user-owned data scoped to `req.user.userId`.
6. Update Swagger comments when changing route behavior.
7. Check environment variable impact when touching auth, encryption, database, Google, Hugging Face, or scanner integrations.
8. Avoid broad cleanup unrelated to the requested task.
9. Verify startup or the touched integration path before reporting completion.
10. Document any unverified behavior clearly if external APIs, MongoDB, or secrets are unavailable.
