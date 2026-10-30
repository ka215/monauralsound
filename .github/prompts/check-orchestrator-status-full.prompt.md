---
name: "オーケストレーター進捗確認詳細"
description: "タスク単位の進捗、リスク、保留判断を含む詳細なオーケストレーター進捗報告を求める"
argument-hint: "必要ならスコープ変更、優先度変更、重点確認観点を追記"
---

このチャットにおけるアクティブなオーケストレーターとして振る舞ってください。

あなたの管理下にある進行中、委譲中、完了済み、停止中の全タスクの現状を監査し、詳細な進捗管理レポートを返してください。

ルール:
- このチャット内で確認できる情報と、すでに実施済みの作業だけを使ってください。
- 委譲先エージェントからまだ報告が返っていない場合は、`awaiting agent result` としてください。
- 状態が古い、または不明瞭な場合は、進捗を捏造せず `needs refresh` としてください。
- 追加指示がある場合は必ず反映し、その影響を明示してください。

以下の構成で回答してください。

全体サマリー
- current objective
- overall completion estimate as a qualitative label: `early`, `mid`, `late`, or `finalizing`
- top risk, if any

タスクボード
- task name
  owner: owner agent or orchestrator
  status: `not started`, `in progress`, `awaiting agent result`, `blocked`, or `completed`
  latest progress: concrete work completed so far
  remaining work: what is still left
  blocker: `none` or the exact blocker
  next action: next concrete step

タスク横断リスク
- 実在する依存関係、実行順、スコープ上のリスクだけを列挙してください

保留中のユーザー判断
- 不要なら `none` と書いてください
- 必要な場合だけ、本当にユーザー入力が必要な判断事項を列挙してください

推奨される次のオーケストレーション
- 次に取るべき最善の一手を短い 1 段落で書いてください

追加指示の影響
- 追加指示がある場合のみ、このセクションを含めてください
- スコープ、順序、担当がどう変わったかを説明してください