# Database

Use MongoDB Atlas with Mongoose.

## Main Entities

### Owner
Single owner/account information.

### Contact
Typical fields:
- ownerId
- name
- whatsappId
- phone
- relationship
- language
- communicationStyle
- aiEnabled
- conversationMode
- notes
- memoryPermissions
- photoPermissions
- approvalRules
- timestamps

### Relationship
Configurable relationship category and default rules.

### Conversation
- ownerId
- contactId
- mode
- humanTakeover
- timestamps

### Message
- conversationId
- contactId
- direction
- type
- content
- image reference
- caption
- senderType
- providerMessageId
- deliveryStatus
- simulated
- timestamps

### Personalization
Owner profile, communication preferences, disclosure/privacy preferences.

### PhotoAsset
- ownerId
- storageKey
- filename
- mimeType
- size
- dimensions
- category
- description
- sharingEnabled
- autoSendEnabled
- visibility
- allowedContactIds
- allowedRelationships
- requiresApproval
- isPrimary
- timestamps

Default new photo: private, sharing disabled, auto-send disabled.

### ApprovalRequest
- ownerId
- contactId
- conversationId
- type
- draft/message
- photoId
- caption
- reason
- status
- timestamps

### Memory
Approved long-term conversational memory. Must remain contact-aware.

### ActivityLog
Important AI, permission, approval, messaging, photo, and system events.

Do not store large image binaries in MongoDB.
