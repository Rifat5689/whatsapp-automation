# Architecture

Use a simple modular monolith.

## Core
React frontend → Node/Express API → MongoDB Atlas

## Production Target
- Frontend: AWS S3 + CloudFront
- Backend: AWS App Runner
- Personal photos: private Amazon S3
- Database: MongoDB Atlas
- WhatsApp: Meta WhatsApp Cloud API

## Adapters
Use adapters only where external providers may change.

MessagingAdapter:
- MockWhatsAppAdapter
- MetaWhatsAppAdapter

StorageAdapter:
- LocalStorageAdapter
- AmazonS3StorageAdapter

AI provider access should also be abstracted so providers can be swapped without rewriting business logic.

## Message Flow
Incoming message → identify contact → load rules/personalization/context → detect intent → generate candidate response/action → permission checks → auto-send / approval / block / manual → messaging adapter → activity log.

AI is not the authorization layer. Backend rules have final authority.

Avoid unnecessary microservices, Redis, queues, event buses, Kubernetes, vector databases, and speculative scaling architecture.
