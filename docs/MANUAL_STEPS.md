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

1. The local MongoDB Atlas connection has been verified. In Atlas Network Access, allow the Elastic Beanstalk instances' stable egress address or approved VPC networking path and retain TLS. Set `MONGODB_URI` in Elastic Beanstalk environment properties; do not upload `backend/.env`.
2. Create a private S3 photo bucket with public access blocked in AWS; copy the bucket name and region into backend deployment secrets to enable the production storage adapter.
3. Configure an AI provider account and server-side API key in the chosen provider console; add the key only to backend deployment secrets and select its provider/model in RIFAT.AI.
4. Create a Meta app and WhatsApp Cloud API configuration in Meta for Developers; copy the phone-number ID, business-account ID, access token, app secret, and verification token into backend deployment secrets.
5. After staging exists, configure Meta's webhook callback to the staging HTTPS endpoint and subscribe to message/status events.
6. Create S3/CloudFront frontend hosting, DNS, and SSL resources in AWS; configure the frontend API origin and backend secrets there.

## Elastic Beanstalk production deployment

1. In Elastic Beanstalk, confirm `rifat-ai-backend-prod` uses the Node.js 24 on Amazon Linux 2023 platform and its health-check path is `/api/v1/health`.
2. In the environment's Configuration → Updates, monitoring, and logging → Environment properties, set `NODE_ENV=production`, `MONGODB_URI`, `OWNER_EMAIL`, `OWNER_PASSWORD_HASH`, `JWT_SECRET`, and `FRONTEND_ORIGIN`. Add provider-specific variables from `backend/.env.example` only when those adapters are enabled. GitHub repository secrets are deployment credentials and do not become runtime variables automatically.
3. In MongoDB Atlas, permit the environment's approved network path. Copy no database password into GitHub workflow files or deployment ZIPs.
4. Attach a least-privilege policy to the IAM principal behind `AWS_ACCESS_KEY_ID`. Scope S3 permissions to `arn:aws:s3:::elasticbeanstalk-ap-southeast-2-497746198174/rifat-ai-deployments/*` and Elastic Beanstalk permissions to the `rifat-ai-backend` application and `rifat-ai-backend-prod` environment where IAM condition keys permit. Required actions are `s3:PutObject`, `elasticbeanstalk:CreateApplicationVersion`, `elasticbeanstalk:UpdateEnvironment`, and `elasticbeanstalk:DescribeEnvironments`. Do not grant access to the personal-photo bucket or `AdministratorAccess`.
5. In GitHub Settings → Environments, create or reuse `production`, add required reviewers/branch restrictions if desired, and ensure only `main` can deploy. Keep the existing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` repository or environment secrets.
6. Trigger the first deployment by opening Actions → Deploy backend to production → Run workflow on `main`, or push a backend deployment-file change to `main`.
7. To roll back, find a previously healthy version under Elastic Beanstalk → Application versions, then deploy it to `rifat-ai-backend-prod`; equivalently run `aws elasticbeanstalk update-environment --environment-name rifat-ai-backend-prod --version-label <previous-version>` and wait for the environment update.

Use `backend/.env.example` as the complete server-side variable checklist and `frontend/.env.example` only for public frontend configuration. Never copy server secrets into `VITE_*` variables.
