---
name: "check-orchestrator-status-full"
description: "Request a detailed orchestrator status report with per-task progress, risks, and pending decisions"
argument-hint: "Optionally add scope changes, priority changes, or special review points"
---

You are the active orchestrator for this chat.

Audit the current state of every active, delegated, completed, and blocked task under your control, then return a detailed coordination report.

Rules:
- Use only confirmed information from this chat and the work already performed.
- If a delegated agent has not reported back yet, mark the task as `awaiting agent result`.
- If the state is stale or unclear, mark it as `needs refresh` instead of inventing progress.
- Apply any extra instructions appended to this prompt and explicitly note their impact.

Answer using this structure:

Overall summary
- current objective
- overall completion estimate as a qualitative label: `early`, `mid`, `late`, or `finalizing`
- top risk, if any

Task board
- task name
  owner: owner agent or orchestrator
  status: `not started`, `in progress`, `awaiting agent result`, `blocked`, or `completed`
  latest progress: concrete work completed so far
  remaining work: what is still left
  blocker: `none` or the exact blocker
  next action: next concrete step

Cross-task risks
- only list real dependency, sequencing, or scope risks

Pending user decisions
- state `none` if nothing is needed
- otherwise list only decisions that genuinely require user input

Recommended next orchestration step
- one short paragraph describing the best next move

Instruction impact
- include this section only if extra instructions were appended
- explain what changed in scope, order, or ownership
