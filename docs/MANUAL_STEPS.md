# Manual Steps

Record only actions the owner must perform outside the codebase.

Examples may include:
- AWS resource creation/configuration
- MongoDB Atlas setup
- S3 bucket setup
- CloudFront/App Runner configuration
- DNS/SSL setup
- Meta Developer / WhatsApp setup
- webhook configuration
- AI provider credentials
- environment/secrets configuration

For every manual step record:
1. What to do.
2. Where to do it.
3. Why it is needed.
4. What value must be copied.
5. Where that value is used in the application.

Never invent credentials or external values.

## Pending deployment and production integrations

1. The local MongoDB Atlas connection has been verified. In Atlas Network Access, allow the Azure App Service outbound addresses or approved private networking path and retain TLS. Set `MONGODB_URI` in App Service environment variables; do not upload `backend/.env`.
2. Keep the Cloudflare R2 photo bucket private and disable its `r2.dev` public development URL. Create a bucket-scoped R2 API token with Object Read & Write permission, then set `STORAGE_PROVIDER=r2`, `CLOUD_STORAGE_ACCOUNT_ID`, `CLOUD_STORAGE_ACCESS_KEY`, `CLOUD_STORAGE_SECRET_KEY`, and `CLOUD_STORAGE_BUCKET` in Azure App Service. Rotate the credentials exposed during setup before deploying. The backend streams authenticated photo requests and does not use `CLOUD_STORAGE_PUBLIC_URL`.
3. Configure an AI provider account and server-side API key in the chosen provider console; add the key only to backend deployment secrets and select its provider/model in RIFAT.AI.
4. Create a Meta app and WhatsApp Cloud API configuration in Meta for Developers; copy the phone-number ID, business-account ID, access token, app secret, and verification token into backend deployment secrets.
5. When the Meta integration task is complete, configure Meta's webhook callback to the production Azure HTTPS endpoint and subscribe to message/status events.
6. Firebase Hosting is the current frontend target. Creating S3/CloudFront frontend hosting, DNS, and SSL resources in AWS is deferred until the later AWS migration.

## Azure App Service production deployment

1. Create a Linux Azure App Service Web App with the Node.js 24 runtime and Always On enabled. Configure its health-check path as `/api/v1/health`.
2. In App Service Configuration, set `NODE_ENV=production`, `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `ENABLE_ORYX_BUILD=false`, `MONGODB_URI`, `OWNER_USERNAME`, `OWNER_PASSWORD`, `JWT_SECRET`, and `FRONTEND_ORIGIN`. The GitHub workflow includes production dependencies, so Azure remote build should remain disabled. Set the owner credentials only in Azure, never in Git. Set `FRONTEND_ORIGIN=https://whatsapp-automation-9e865.web.app` without a trailing slash, save the settings, and restart the Web App. Add provider-specific variables from `backend/.env.example` only when those adapters are enabled.
3. In MongoDB Atlas, permit the Web App's listed outbound IP addresses or its approved private networking path. Copy no database password into workflow files or deployment ZIPs.
4. In GitHub Settings > Environments > `production`, keep the `AZUREAPPSERVICE_PUBLISHPROFILE_B4A3AFC2356F418B9967A00F75A991BF` secret populated with the publish profile for `whatsapp-automations`. Restrict the environment to `main` and add reviewers if desired.
5. In GitHub Settings > Environments > `production`, add the Firebase service-account JSON as the secret `FIREBASE_SERVICE_ACCOUNT_WHATSAPP_AUTOMATION_9E865`. If `firebase init hosting:github` already created this repository secret, confirm it is available to the `production` environment. The service account should be limited to deploying Firebase Hosting for project `whatsapp-automation-9e865`. The frontend workflow uses `https://whatsapp-automations-cbhggxbmepdmh7ch.centralindia-01.azurewebsites.net/api/v1` as its production API.
6. Trigger the first deployment from Actions > Deploy backend to Azure production > Run workflow on `main`, or push a backend deployment-file change to `main`.
7. After verifying the Azure deployment, revoke/delete the old AWS deployment credentials from GitHub if they are no longer used elsewhere. Rotate the MongoDB user password that was previously present in `backend/.env.example`, then update local and Azure `MONGODB_URI` values.

Use `backend/.env.example` as the complete server-side variable checklist and `frontend/.env.example` only for public frontend configuration. Never copy server secrets into `VITE_*` variables.
