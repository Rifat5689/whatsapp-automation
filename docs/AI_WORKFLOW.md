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

Potential capabilities:
- generateReply
- classifyIntent
- classifyPhotoRequest
- determinePhotoCategory
- generatePhotoCaption
- extractMemoryCandidate

Avoid unnecessary AI calls when deterministic application logic can solve the problem.
