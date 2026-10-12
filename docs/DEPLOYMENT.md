# Deployment

## Environments
- development
- staging
- production

## Current Target
- Frontend: Firebase Hosting (`whatsapp-automation-9e865`)
- Backend: Azure App Service (Linux, Node.js 24)
- Database: MongoDB Atlas
- Personal media: private Amazon S3
- Messaging: Meta WhatsApp Cloud API

## Rules
- Deploy to staging before production.
- Keep secrets outside Git.
- Use HTTPS in production.
- Keep private media private.
- Do not mix production credentials into local development.
- Production provider integrations should replace mocks through adapters, not business-logic rewrites.

Actual manual cloud/dashboard setup belongs in `MANUAL_STEPS.md`.

## Backend production automation

Pushes to `main` that change backend deployment files run `.github/workflows/backend-production.yml`. The workflow performs package and JavaScript syntax validation, installs production-only dependencies into a self-contained backend ZIP, deploys it cleanly to Azure App Service using a publish profile, and verifies `/api/v1/health`. Run the full backend test suite locally before pushing.

Pushes to `main` that change frontend files run `.github/workflows/frontend-production.yml`. The workflow builds the frontend against the Azure API and deploys `frontend/dist` to the Firebase Hosting live channel.
