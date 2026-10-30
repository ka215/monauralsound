---
title: 開発計画
purpose: ka2.org ヘッドレス再構築の作業フェーズ、成果物、完了条件を定義する
status: active
related:
  - ./headless-refactoring-design.md
  - ./progress-tracker.md
---

# 開発計画

設計の根拠と決定事項は [headless-refactoring-design.md](./headless-refactoring-design.md)、進捗は [progress-tracker.md](./progress-tracker.md) を参照する。

## 前提

- 作業ディレクトリは `ka2.org/` ワークスペース。`frontend/`(Nuxt 4)と `backend/`(manage.ka2.org の WordPress)のモノレポ。
- 本番サーバー(CoreServer)への書き込みは、各フェーズの明示的な着手承認後にのみ行う。調査は読み取り専用。
- デザインはワイヤーフレームを作らず、現行構成をベースにローカルで確認しながら調整する。
- backend の本番実行環境は PHP 8.5.12(CLI は 8.4.27)。開発はローカルの 8.4.27 準拠とし、8.5 での確認は Phase 7 のステージングで行う。WordPress 最新版(7.1 系)は 8.4/8.5 とも対応する。
- バックアップ: DB は CoreServer の日次 dump(15 世代)。コードは GitHub から再デプロイしてロールバックする。

## フェーズ一覧

| Phase | 名称 | 主な成果物 | 完了条件 |
|---|---|---|---|
| 0 | 調査・設計 | 現状調査、記事棚卸し(`.temp/content-inventory.csv`)、設計書、本計画 | 設計・判断事項の合意(完了) |
| 1 | リポジトリ基盤と frontend 雛形 | `frontend/`(Nuxt 4、Tailwind、PWA の雛形)、lint/型チェック、リポジトリ構成、`.gitignore` | ローカルで `generate` が通り、トップが表示される |
| 2 | データ取得層とページ生成 | WP REST クライアント(型付き)、記事・カテゴリ・固定ページ・トップ・注目/関連記事、コンテンツ変換、SEO、sitemap/RSS | 全移行対象 202 件が静的生成され、URL が一覧と一致する |
| 3 | UI・PWA・同意管理 | モバイルファースト UI、Cookie 同意(localStorage)、GA4、AdSense(同意前は非パーソナライズ)、PWA(manifest/SW/オフライン) | モバイル実機相当で主要導線が動作し、Lighthouse の PWA/性能が基準を満たす |
| 4 | backend 構築 | `backend/`(Composer による WP 固定)、mu-plugin(REST 公開範囲、`featured`、Deploy Hook)、管理用最小テーマ、ローカル検証環境 | ローカルで frontend がこの backend から生成できる |
| 5 | 問い合わせ機能 | `ka2/v1/contact` エンドポイント、Turnstile 検証、レート制限、Flamingo 保存、メール通知、フォーム UI | ローカルで送信から保存・通知まで通る |
| 6 | データ移行 | 移行対象 202 件と画像、Flamingo データ(contact 13/inbound 5)のインポート手順とスクリプト、本文変換(画像 URL・ショートコード除去) | 移行後の記事内容が旧サイトと整合する |
| 7 | CI/CD とステージング | GitHub Actions(backend の rsync 配備、frontend のチェック)、Cloudflare Pages 設定、`_redirects`/`_headers`、画像プロキシ Function、ステージングでの検証 | ステージングで全機能と全リダイレクトを確認 |
| 8 | 本番切替と旧環境撤去 | DNS 切替、manage.ka2.org のクリーンインストール反映、旧 `ka2.org/apps` 等の撤去、監視 | 本番で新構成が稼働し、旧環境の撤去が完了 |

## 各フェーズの詳細

### Phase 1: リポジトリ基盤と frontend 雛形
- Node.js の有無とバージョンをローカルで確認する(未確認のため前提にしない)。
- `frontend/` を Nuxt 4 で初期化し、Tailwind、`@vite-pwa/nuxt`、ESLint/型チェックを導入する。
- `trailingSlash: false`、`ssr: true` + `nuxt generate` の設定を入れる。
- リポジトリ直下の構成(`frontend/`、`backend/`、`docs/`、`.github/`)と `.gitignore` を整える。

### Phase 2: データ取得層とページ生成
- ビルド時のみ WP REST(`wp/v2`)を呼ぶ。接続先は環境変数で切り替える(ローカル/ステージング/本番)。
- ルート: `/`、`/{category}`、`/{slug}`、`/privacy-policy`、`/contact`、`/jquery-timeline/{slug}`。
- 本文変換: `ka2.org/assets/...` と `wp-content/uploads` 参照の正規化、wp.com 画像の元 URL 化、ショートコード残骸の除去、コードの構文ハイライト。
- 注目記事(`featured`)と関連記事(カテゴリ/タグの重なり)をビルド時に算出する。
- SEO(title/description/OGP/canonical)、`sitemap.xml`、`robots.txt`、RSS。
- 日本語 slug(ID 106、19288)のパスを検証する。

### Phase 3: UI・PWA・同意管理
- 現行の情報構成を踏襲し、モバイルファーストで刷新する。ヘッダのログイン導線は置かない。
- Cookie 同意の状態を localStorage に保存する。同意前は GA4 を読み込まず、AdSense は非パーソナライズ広告として出す。
- PWA: manifest、アイコン、Service Worker(stale-while-revalidate)、オフラインフォールバック。

### Phase 4: backend 構築
- `backend/` に Composer で WordPress 本体を固定する。`wp-config.php`、`uploads`、DB は管理外とする。
- mu-plugin: 未認証の REST 公開範囲の絞り込み(`users` 等の遮断)、`featured` の REST 公開、Deploy Hook(デバウンス付き)。
- ローカル検証環境は XAMPP(PHP 8.4.27)を利用する。他プロジェクトへの影響を避けるため PHP のバージョンは切り替えない。Composer の `config.platform.php` を `8.4` に固定し、本番 8.5 との差はステージングで確認する。

### Phase 5: 問い合わせ機能
- `POST /wp-json/ka2/v1/contact`: 入力検証、Turnstile のサーバー検証、レート制限、`flamingo_inbound` 保存、管理者へのメール通知。
- CORS は `https://ka2.org`(とローカル開発オリジン)のみ許可する。

### Phase 6: データ移行
- 旧 DB から、移行対象 202 件と関連メディア、Flamingo データのみを抽出して新環境へ取り込む。
- 取り込み後の `uploads` の参照整合を確認する。

### Phase 7: CI/CD とステージング
- backend: GitHub Actions で `composer install` → 構文検査 → SSH(rsync)。`uploads`/`wp-config.php` は `--delete` から除外する。配備用 SSH 鍵は専用鍵とする。
- frontend: Cloudflare Pages の GitHub 連携。WP の Deploy Hook でも再ビルドする。
- `_redirects`: `.temp/_redirects.draft` を基に確定し、モックアップの旧パス 5 本を追加する。
- `functions/assets/[[path]].ts`: manage 側の uploads へプロキシする。

### Phase 8: 本番切替と旧環境撤去
- 切替前に DB と `uploads` のフルバックアップを取得する。
- 旧 `ka2.org/apps`(WP)、`msfe_` DB、旧テーマ、公開ディレクトリ内の不要物を撤去する。
- manage.ka2.org の新規インストールと、新 WordPress の認証キー/ソルトの再生成(旧値は流用しない)。

## 運用ルール

- フェーズ完了時に [progress-tracker.md](./progress-tracker.md) を更新し、次作業の申し送りを書く。
- 設計の変更は [headless-refactoring-design.md](./headless-refactoring-design.md) に反映する。
- 本番への書き込み(Phase 7 以降)は事前に承認を取る。
- 一時メモは `.temp/` に置く。
