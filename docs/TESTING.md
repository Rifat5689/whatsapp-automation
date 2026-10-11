# Testing

Run targeted tests for the feature being changed. Do not chase meaningless maximum coverage.

## Core Areas

### Authentication
- valid login
- invalid login
- protected route access

### Contacts & Rules
- create/update
- relationship rules
- contact permissions

### Conversations
- AI Auto
- AI Approval
- Manual
- human takeover
- resume AI
- failed/retry states

### AI
- intent detection
- AI disabled
- contact AI disabled
- fallback behavior
- context isolation

### Photos
- valid upload
- invalid/spoofed upload
- oversized upload
- private access denial
- contact/relationship permissions
- unknown-contact approval
- category selection
- multiple matches
- approval/rejection
- manual send
- auto-send
- failed send
- duplicate prevention
- deletion

### Global Controls
- emergency stop
- human takeover blocks outbound automation

For each task, report what was actually run and whether it passed.
