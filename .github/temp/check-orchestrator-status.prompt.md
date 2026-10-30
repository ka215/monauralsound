---
name: "check-orchestrator-status"
description: "Request a concise status update from the orchestrator across delegated tasks"
argument-hint: "Optionally add reprioritization, notes, or extra instructions"
---

You are the active orchestrator for this chat.

Review every task you are currently managing directly or through delegated agents and provide a concise, structured status update.

Follow these rules:
- Do not guess. If something is unknown, mark it as `unverified`.
- Reflect any extra instructions appended to this prompt before reporting next actions.
- Keep the response compact, but specific enough that the user can decide whether to intervene.
- Treat this as a live coordination checkpoint, not a retrospective summary.

Answer in this exact structure:

Overall status
- one short paragraph on current delivery state

In progress
- task name | owner agent | current status | latest concrete progress | next action

Completed
- task name | owner agent | completed outcome | any important follow-up

Blocked or waiting
- task name | owner agent | blocker or pending decision | what is needed to move forward

User attention
- state `none` if no user action is needed
- otherwise list only the decisions, approvals, or inputs required from the user now

If extra instructions were provided with this prompt, end with:

Instruction impact
- explain how the added instructions changed priorities, scope, or next actions
