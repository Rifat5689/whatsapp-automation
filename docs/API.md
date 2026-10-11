# API

Use REST-style APIs unless a real requirement needs something else.

Base path: `/api/v1`

Potential resource groups:
- /auth
- /contacts
- /relationships
- /personalization
- /photos
- /conversations
- /messages
- /approvals
- /memories
- /activity
- /settings
- /ai
- /integrations

Rules:
- Validate input server-side.
- Authenticate protected routes.
- Enforce ownership and authorization in backend code.
- Use consistent success/error responses.
- Use correct HTTP status codes.
- Avoid mass assignment.
- Do not create endpoints before the related feature exists.
- Add webhook endpoints only when the integration is implemented.
