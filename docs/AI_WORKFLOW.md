# AI Workflow

AI handles language/reasoning tasks; application code handles permissions.

## Incoming Message
Message → identify contact → load permitted contact rules/personalization/recent context → detect intent → generate candidate reply/action → backend permission checks → auto-send / approval / block / manual → send → log result.

## Context
Send only relevant and permitted information to the AI:
- owner personalization
- contact identity/relationship
- applicable rules
- recent messages
- relevant permitted memory
- current message

Do not send entire databases or full histories unnecessarily.

## Photo Request
Detect request → determine category → find matching owner photos → filter by permissions → select eligible photo → determine approval → generate caption → recheck permissions → send or create approval.

Never fabricate an owner photo or select an unauthorized photo.

## AI Provider Strategy
Use an abstraction so the provider/model can change without rewriting the application.

The primary free-testing path is OpenRouter. A single `openrouter/free` selection lets OpenRouter choose an available free model, while a comma-separated model list gives an explicit fallback order. The application can then fall back to a configured direct Gemini model list and finally Mock through the primary/fallback settings. Provider calls have bounded timeouts and output limits; backend permission checks still run after generation.

The owner can select Personalized mode, which supplies the editable owner profile, language, tone, response length, humor, emoji, sharing boundaries, unknown-contact behavior, and current contact rules. Raw mode supplies only the latest user message for comparison. Backend privacy, approval, emergency-stop, and takeover rules remain authoritative in both modes.

Potential capabilities:
- generateReply
- classifyIntent
- classifyPhotoRequest
- determinePhotoCategory
- generatePhotoCaption
- extractMemoryCandidate

Avoid unnecessary AI calls when deterministic application logic can solve the problem.
