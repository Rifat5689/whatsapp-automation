# Architecture

Use a simple modular monolith.

## Core
React frontend → Node/Express API → MongoDB Atlas

## Production Target
- Frontend: Firebase Hosting
- Backend: Azure App Service
- Personal photos: private Cloudflare R2
- Database: MongoDB Atlas
- WhatsApp: Meta WhatsApp Cloud API

## Adapters
Use adapters only where external providers may change.

MessagingAdapter:
- MockWhatsAppAdapter
- MetaWhatsAppAdapter

StorageAdapter:
- LocalStorageAdapter
- CloudflareR2StorageAdapter

AI provider access should also be abstracted so providers can be swapped without rewriting business logic.

## Message Flow
Incoming message → identify contact → load rules/personalization/context → detect intent → generate candidate response/action → permission checks → auto-send / approval / block / manual → messaging adapter → activity log.

AI is not the authorization layer. Backend rules have final authority.

Avoid unnecessary microservices, Redis, queues, event buses, Kubernetes, vector databases, and speculative scaling architecture.
