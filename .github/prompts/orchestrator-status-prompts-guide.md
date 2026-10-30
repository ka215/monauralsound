# オーケストレーター進捗確認プロンプトガイド

以下は、オーケストレーターとのやり取りで進捗確認を簡潔に行うためのカスタムプロンプトの使い分けガイドです。

これらのプロンプトは、現在チャットで選択している Agent に対して発行されます。

## 利用できるプロンプト

### /check-orchestrator-status
- 表示名は「オーケストレーター進捗確認」です。
- 一番標準の進捗確認です。
- 全体状況、進行中、完了、ブロッカー、ユーザー確認事項を短く確認したいときに使います。
- 追加指示がある場合は、そのまま続けて書いて問題ありません。

例:

```text
/check-orchestrator-status
API 契約レビューを最優先にし、UI の磨き込みは後回しにしてください。
```

### /check-orchestrator-status-full
- 表示名は「オーケストレーター進捗確認詳細」です。
- 詳細な進捗確認です。
- タスクごとの進み具合、残作業、依存関係、リスク、保留判断を見たいときに使います。
- 長めでもよいので、今の全体盤面を正確に把握したい場合に向いています。

例:

```text
/check-orchestrator-status-full
状態が古いタスクや unverified のタスクも必ず明記してください。
```

### /check-orchestrator-blockers
- 表示名は「オーケストレーターのブロッカー確認」です。
- ブロッカー確認専用です。
- いま介入すべきこと、判断が必要なこと、止まっている委譲や handoff を知りたいときに使います。
- 正常進行中のタスクは省略される想定です。

例:

```text
/check-orchestrator-blockers
今日中に私の判断が必要なものがあれば優先して挙げてください。
```

## 推奨される使い分け
- まずは /check-orchestrator-status を標準運用にする
- 盤面を詳しく見たいときだけ /check-orchestrator-status-full を使う
- 介入要否だけを知りたいときは /check-orchestrator-blockers を使う

## 補足
- これらは自動通知ではなく、入力コストを下げた polling 用のプロンプトです。
- 応答品質を安定させるには、オーケストレーターが task name、owner agent、status、latest confirmed progress、blocker、next action、user input needed を保持している必要があります。
- 委譲先エージェントからの返答が揃っていない場合は、status を awaiting agent result または unverified として扱う運用を前提にしています。