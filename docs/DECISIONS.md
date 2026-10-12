# Decisions

Record meaningful project decisions only.

## Current Decisions

### Product
- RIFAT.AI starts as a single-owner application.
- Primary pages: Conversations, Friends & Rules, Personalization, AI Models, Activity & Tracking, Settings.
- `My Photos` lives under Personalization.

### Architecture
- Use a simple modular monolith.
- Frontend: React + Vite + JavaScript.
- Backend: Node.js + Express + JavaScript.
- Database: MongoDB Atlas + Mongoose.
- Avoid unnecessary infrastructure and abstractions.

### Hosting
- Frontend target: Firebase Hosting for now; AWS hosting may replace it later.
- Backend target: Azure App Service on Linux using Node.js 24.
- Photo storage target: private Amazon S3.

### Integrations
- WhatsApp production transport: official Meta WhatsApp Cloud API.
- Use mock messaging before Meta credentials are configured.
- Use provider adapters for messaging, storage, and AI integrations where useful.

### Development
- Keep the React application in `frontend/` and the Express application in `backend/`.
- Work feature-by-feature.
- Current Git workflow may use direct work on `main` unless changed later.
- External/manual setup is documented in `MANUAL_STEPS.md`.
- Single-owner login credentials are supplied only through server-side environment variables.

### Privacy
- Backend rules override AI decisions.
- Personal photos are private by default.
- Unknown contacts never receive personal photos automatically.
- Global privacy restrictions override lower-level permissions.
