# Deployment

## Environments
- development
- production

## Current Target
- Frontend: Firebase Hosting (`whatsapp-automation-9e865`)
- Backend: Azure App Service (Linux, Node.js 24)
- Database: MongoDB Atlas
- Personal media: private Cloudflare R2
- Messaging: Meta WhatsApp Cloud API

## Rules
- Develop and verify each task locally on its own feature branch before merging to `main`.
- Keep secrets outside Git.
- Use HTTPS in production.
- Keep private media private.
- Do not mix production credentials into local development.
- Production provider integrations should replace mocks through adapters, not business-logic rewrites.

Actual manual cloud/dashboard setup belongs in `MANUAL_STEPS.md`.

## Backend production automation

Pushes to `main` that change backend deployment files run `.github/workflows/backend-production.yml`. The workflow performs package and JavaScript syntax validation, installs production-only dependencies into a self-contained backend ZIP, deploys it cleanly to Azure App Service using a publish profile, and verifies `/api/v1/health`. Run the full backend test suite locally before pushing.

Pushes to `main` that change frontend files run `.github/workflows/frontend-production.yml`. The workflow builds the frontend against the Azure API and deploys `frontend/dist` to the Firebase Hosting live channel.

Feature branches do not deploy. Create them from an updated `main`, run `npm run check`, push the branch, review it, then merge it into `main`. The matching production workflow runs after the merge.

## Local development

Run `npm install` once and then `npm run dev` from the repository root. Vite serves the frontend at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:3001`. Keep `VITE_API_BASE_URL=/api/v1` locally, or leave it unset. The Firebase production workflow injects the Azure API URL during its build.

`FRONTEND_ORIGIN` is an exact, comma-separated CORS allow-list. Local development normally uses `http://localhost:5173`; Azure normally uses only `https://whatsapp-automation-9e865.web.app`. Do not use `*` with authenticated requests.
