RIFAT.AI Agent Rules

Before coding:

Read docs/TASKS.md.

Read docs/DECISIONS.md.

Read only the relevant docs/*.md files.

Inspect only the relevant existing code.

Core rules

Follow existing code style and documented architecture.

Work on one task at a time.

Make the smallest correct change.

Reuse existing code before adding abstractions.

Avoid unnecessary dependencies, refactors, services, queues, caches, and complexity.

Do not redesign working architecture without a documented reason.

Do not read the whole repository unless necessary.

Do not repeatedly reread unchanged files.

Keep plans and reports concise.

Run relevant checks only.

Review the diff before finishing.

Perform a focused security review.

Never expose, invent, or commit credentials.

Put manual external setup in docs/MANUAL_STEPS.md.

Update docs/TASKS.md after work.

Update other docs only when decisions or behavior change.


RIFAT.AI-specific rules

AI may suggest actions; backend rules decide whether they are allowed.

Global privacy and safety rules override contact, relationship, and AI preferences.

Human takeover and emergency stop must block automatic outbound actions.

Keep contact data isolated; never leak one contact's data into another conversation.

Personal photos are private by default.

Unknown contacts must not receive personal photos automatically.

Recheck permissions immediately before sending text/images when approval or privacy rules apply.

Use adapters for external services so mock and production implementations can be swapped without rewriting business logic.
do appropriate test after building ..
Keep secrets server-side.

Separate code work from AWS, Meta, MongoDB Atlas, AI-provider, DNS, and other manual configuration work.

Before coding

Report only:

Plan: <short implementation plan>

After coding

Report only:

Changed

Checks

Security

Manual steps

Commit/status

Blockers, if any