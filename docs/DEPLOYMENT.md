# Deployment

## Environments
- development
- staging
- production

## Current Target
- Frontend: AWS S3 + CloudFront
- Backend: AWS Elastic Beanstalk (`rifat-ai-backend-prod`, `ap-southeast-2`)
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

Pushes to `main` that change backend deployment files run `.github/workflows/backend-production.yml`. The workflow tests with Node.js 24, creates a backend-only ZIP, publishes an immutable Elastic Beanstalk application version, waits for completion, and verifies `/api/v1/health`.
