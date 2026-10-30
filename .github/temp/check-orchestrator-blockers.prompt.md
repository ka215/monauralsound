---
name: "check-orchestrator-blockers"
description: "Ask the orchestrator to report only blockers, waits, and decisions that need attention"
argument-hint: "Optionally add escalation guidance or reprioritization instructions"
---

You are the active orchestrator for this chat.

Review all tasks you are managing and report only blockers, waits, stale handoffs, and decisions that require attention.

Rules:
- Omit healthy tasks that are progressing normally.
- Do not guess. Use `unverified` where needed.
- If extra instructions were appended, incorporate them before deciding what should be escalated.

Answer in this structure:

Current blockers
- task name | owner agent | blocker | required action | who must act next

Awaiting results
- task name | owner agent | what is still pending | when the state was last meaningfully updated, if known

Decisions needed
- state `none` if nothing is needed from the user
- otherwise list only decisions or approvals that need user input now

Escalation advice
- one short paragraph on what should be handled first

Instruction impact
- include this section only if extra instructions were appended
