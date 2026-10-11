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

1. Create MongoDB Atlas resources and a least-privilege database user in Atlas; copy the connection URI into the backend deployment secret `MONGODB_URI` to replace local development storage.
2. Create a private S3 photo bucket with public access blocked in AWS; copy the bucket name and region into backend deployment secrets to enable the production storage adapter.
3. Configure an AI provider account and server-side API key in the chosen provider console; add the key only to backend deployment secrets and select its provider/model in RIFAT.AI.
4. Create a Meta app and WhatsApp Cloud API configuration in Meta for Developers; copy the phone-number ID, business-account ID, access token, app secret, and verification token into backend deployment secrets.
5. After staging exists, configure Meta's webhook callback to the staging HTTPS endpoint and subscribe to message/status events.
6. Create App Runner, S3/CloudFront frontend hosting, DNS, and SSL resources in AWS; configure the frontend API origin and backend secrets there.
