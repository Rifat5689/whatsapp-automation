# Security

Security is part of every feature.

## Core Rules
- Backend enforces authentication, ownership, authorization, and permissions.
- Never trust hidden frontend controls as authorization.
- Never commit secrets.
- Keep AI/provider/cloud credentials server-side.
- Do not log tokens, passwords, keys, or private credentials.
- Validate all external input.
- Avoid unrestricted mass assignment.
- Keep contact data isolated.

## Risks to Review When Applicable
- authentication bypass
- authorization errors / IDOR / BOLA
- injection
- XSS
- CSRF
- SSRF
- unsafe uploads
- secret exposure
- sensitive data leakage
- privilege escalation
- business-logic abuse
- rate-limit abuse
- duplicate processing
- webhook abuse

## Photos
- Private by default.
- Validate signature, MIME, size, and dimensions.
- Strip unnecessary EXIF metadata, including location data, before sharing.
- Unknown contacts cannot receive personal photos automatically.
- Global privacy rules override lower-level permissions.
- Recheck permissions immediately before sending.
- No cross-contact file leakage.
- No permanent unrestricted public URLs.

## AI
AI may classify or suggest. Deterministic application logic decides whether an action is allowed.

Only claim vulnerabilities when there is evidence.
