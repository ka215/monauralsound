---
title: 進捗工程表
purpose: フェーズ別の進捗確認と次作業への申し送りに使う
status: active
related:
  - ./development-plan.md
---

# 進捗工程表

最終更新: 2026-11-01

凡例: ✅ 完了 / 🔄 進行中 / ⬜ 未着手 / ⏸ 保留

## フェーズ進捗

| Phase | 名称 | 状態 | 開始 | 完了 |
|---|---|---|---|---|
| 0 | 調査・設計 | ✅ | 2026-10-29 | 2026-10-30 |
| 1 | リポジトリ基盤と frontend 雛形 | ✅ | 2026-10-30 | 2026-10-30 |
| 2 | データ取得層とページ生成 | ✅ | 2026-10-30 | 2026-10-30 |
| 3 | UI・PWA・同意管理 | ✅ | 2026-10-30 | 2026-10-31 |
| 4 | backend 構築 | ✅ | 2026-10-31 | 2026-10-31 |
| 5 | 問い合わせ機能 | ✅ | 2026-10-31 | 2026-10-31 |
| 6 | データ移行 | ✅ | 2026-10-31 | 2026-10-31 |
| 7 | CI/CD とステージング | ✅ | 2026-10-31 | 2026-11-01 |
| 8 | 本番切替と旧環境撤去 | ⬜ | | |

## タスクチェックリスト

### Phase 0 調査・設計
- [x] サーバー構成・WP・テーマ・プラグインの調査
- [x] 記事棚卸しと移行/削除判断(移行 202 件 / 削除 175 件)
- [x] 旧 URL の扱いの決定(削除記事は 301 で `/`、docs 5 件は `/jquery-timeline/...` へ)
- [x] 設計書、開発計画、工程表の作成

### Phase 1 リポジトリ基盤と frontend 雛形
- [x] ローカルの Node.js / パッケージマネージャーの確認(Node 24.22.1、pnpm 11.20.0)
- [x] `frontend/` の Nuxt 4 初期化(Nuxt 4.6.3)
- [x] Tailwind 導入(v4、`@tailwindcss/vite`)
- [x] PWA モジュール導入(`@vite-pwa/nuxt`、manifest と SW の出力を確認)
- [x] ESLint / 型チェック(`pnpm lint`、`pnpm typecheck` が通る)
- [x] `.gitignore` とリポジトリ構成(`frontend/.gitignore` は Nuxt 標準。ルート直下は既存)
- [x] `nuxt generate` の動作確認(`pnpm generate` 成功、`.output/public` に出力)

### Phase 2 データ取得層とページ生成
- [x] データ取得層(型定義付き。スナップショット経由。新 backend への切替は Phase 4)
- [x] ルート生成(トップ / カテゴリ / 記事 / 固定ページ / jquery-timeline)
- [x] 本文変換(画像 URL、ショートコード除去、構文ハイライト)
- [x] 注目記事・関連記事
- [x] SEO、sitemap、robots、RSS
- [x] 全 202 件の生成と出力照合(`pnpm verify:output`)

### Phase 3 UI・PWA・同意管理
- [x] レイアウト(モバイルファースト。ヘッダはメニュー開閉式、ログイン導線なし)
- [x] Cookie 同意(localStorage)
- [x] GA4(同意後に読み込み)
- [x] AdSense(同意前は非パーソナライズ)
- [x] PWA(manifest / SW / オフライン)
- [x] Lighthouse 確認(モバイル perf 98 / a11y 96-100 / SEO 100、デスクトップ perf 100。best-practices 73-77 は 404 画像・3rd-party cookie 由来で Phase 7 で再確認。AdSense は load 後のアイドル時に読み込み)
- [x] 正式なアイコン差し替え、デザイン微調整(タブ、ドロワー、テーマ切替、ScrollTop、無限スクロール、広告枠とデバッグフラグ)

### Phase 4 backend 構築
- [x] `backend/` と Composer による WP 固定(コア 7.1.4、Flamingo、wp-cli。詳細は [backend-setup.md](./backend-setup.md))
- [x] PHP 8.4.27 での WordPress の動作確認(`config.platform.php` は `8.4`)
- [x] REST 公開範囲の絞り込み mu-plugin(未認証の users/comments/settings は 404 を確認)
- [x] `featured` の REST 公開(`meta.featured` とメタボックス)、`docs` 投稿タイプ
- [x] Deploy Hook(デバウンス付き。4 回更新して 1 イベントのみ登録されることを確認)
- [x] 管理用最小テーマ(閲覧は ka2.org へ 302)
- [x] ローカルで frontend と接続して生成確認(テスト 5 件でトップ・記事・カテゴリ・固定ページ・docs を生成)
- [ ] Deploy Hook の実呼び出し(Cloudflare Pages 側の URL 発行後。Phase 7)

### Phase 5 問い合わせ機能
- [ ] `ka2/v1/contact` エンドポイント
- [x] Turnstile 検証、レート制限
- [x] Flamingo 保存、メール通知
- [x] フォーム UI
- [x] ローカルでの送信確認(Turnstile はテスト鍵/偽装で frontend → API → Flamingo まで確認。実 Turnstile と実メール送信は未確認)

### Phase 6 データ移行
- [x] 移行対象の抽出手順(202 件、画像 267 件。[data-migration.md](./data-migration.md))
- [x] Flamingo データ(contact 13 / inbound 5)の移行
- [x] 本文変換と `uploads` 参照の整合確認(参照 1,145 件のうち旧サイトでも欠落の 2 件を除き配置済み)
- [x] 移行結果の突合(旧出力 224 ページと新 backend 出力を比較。差分は抜粋の自動生成・img 寸法付与・1 件のスラッグ整形のみ)

### Phase 7 CI/CD とステージング
- [x] backend は staging へ手動配備する方針を決定。GitHub-hosted runner の SSH 接続拒否により自動配備 workflow と専用鍵・Secrets を停止・削除
- [x] frontend の Cloudflare Pages 連携(`monauralsound.pages.dev` で staging URL の環境変数を使った再ビルドを確認。home/contact/sitemap、画像プロキシ、Turnstile ウィジェットを検証)
- [x] `_redirects` / `_headers` の確定(公開 Pages で 263 静的 + 7 wildcard 規則を検証。削除判定の公開 122 URL はすべてカバー)
- [x] 画像プロキシ Function(`functions/assets/[[path]].ts`。wrangler でローカル検証済み)
- [x] staging 検証(PHP 8.5.12、DB、REST、Pages、全リダイレクト、画像、Turnstile、問い合わせ/通知メール、Deploy Hook HTTP 200)
- [x] Lighthouse 再計測: home mobile 96/100/77/100、desktop 98/100/77/100。contact は暗色ボタンの修正を production へ反映し Accessibility 100(Performance 76、Best Practices 77、SEO 100)。Best Practices は AdSense の third-party cookie、contact の LCP は 4.1 秒

### Phase 8 本番切替と旧環境撤去
- [ ] 切替前フルバックアップ
- [ ] DNS 切替
- [ ] manage.ka2.org のクリーンインストール反映
- [ ] 旧環境の撤去
- [ ] 稼働監視

## 申し送り

### 次の作業
Cloudflare Pages の環境変数を `cloudflare-pages-setup.md` の staging URL に更新してホスト上の再ビルドを確認する。Deploy Hook URL を backend の `wp-config.php` に設定した後、実 Turnstile/メール送信、全リダイレクト、Lighthouse を検証する。GitHub-hosted runner から CoreServer への SSH 接続拒否を解消するか、安全な代替配備方法を決める。Phase 6 の本番反映(DB エクスポート/rsync)と本番 DNS 切替は Phase 8 まで行わない。

### Phase 3 の成果と注意点
- 同意: `useConsent`(localStorage `ka2:consent` = `granted`/`denied`)。バナーはマウント後にのみ描画し、SSG の HTML には含めない(ハイドレーション不一致の回避)。フッターの「Cookie 設定」から再表示できる。
- GA4: `plugins/analytics.client.ts`。同意後にのみ gtag.js を読み込み、`page:finish` で page_view を送る。ID は既存の `G-M0V96QQ4KT`。
- AdSense: 既存の `ca-pub-8602791446931111`。スクリプトは常に読み込み、`requestNonPersonalizedAds` を同意状態(未同意/拒否=1、同意=0)で設定する。広告ユニット枠は `components/AdSlot.vue` を用意済みだが、旧サイトの slot ID が未確認のため `adsenseSlot` は空(自動広告のみ)。slot ID は管理画面で確認して `NUXT_PUBLIC_ADSENSE_SLOT` に設定する。
- PWA: injectManifest 方式(`app/service-worker/sw.ts`)。プリキャッシュは JS/CSS/画像/トップ/オフラインページのみ(30 件、約 420KB)。`_payload.json` は除外し、実行時キャッシュ(SWR)で扱う。ページ遷移は SWR、`/assets/*` は CacheFirst、未キャッシュで失敗した遷移は `/offline` を返す。
- 確認済み(静的ビルドをブラウザで確認): 拒否時は gtag を読み込まない/同意で読み込む、再読込で状態維持、390px 幅で横スクロールなし、SW 登録。
- 注意: `nuxt generate` が失敗すると node プロセスが残ってロックされることがある。`Another Nuxt build is already running` が出たら該当 PID を停止する。
- 現在のデザインは最小限の骨格。ユーザーのローカル確認を受けて調整する。
- 追加調整(2026-10-30): トップは「新着/注目」タブ(ヘッダ直下に sticky、既定は新着)、全記事を同一カードの縦並びに統一。カテゴリ欄は廃止し、著者プロフィール(`AuthorProfile.vue`、全ページのフッター上)を追加。ライト/ダーク切替(`useTheme`、localStorage `ka2:theme`、未設定時は OS 設定。slate スケール反転方式、`main.css`)。旧サイトのアイコンフォント MonauralSound を `app/assets/fonts` と `app/assets/css/icons.css`(`msicon-*`)へ移行。本文フォントは旧サイトと同じ `font-family` 指定。

### Phase 2 の成果と注意点
- データ層: `pnpm fetch:content` が旧 REST から `frontend/.data/*.json` を取得し(Git 管理外)、`nitro.serverAssets` 経由で `server/utils/content.ts` が読む。変換は `server/utils/content-core.ts`(純粋関数)に集約している。Phase 4 以降は取得元を新 backend の REST に切り替える(`NUXT_WP_API_BASE`。`ONLY_MIGRATED=0` で ID 絞り込みを解除)。
- API(ビルド時のみ): `/api/home`、`/api/entry/[slug]`(記事/カテゴリ/固定ページ)、`/api/doc/[slug]`。各ページは `useFetch` の payload として静的化される。
- ルートは `listRoutes()` で明示列挙し、`crawlLinks: false`、`failOnError: true`。本文内の旧 URL(`/mhr/...` 等)をクロールすると 404 になるため。
- 本文変換: Photon/`wp-content`/`assets/YYYY/` → `/assets/uploads/...`、`assets/files/` は維持、外部 Photon は元 URL へ。内部リンクは相対化し末尾スラッシュを除去、docs 旧 URL は新 URL へ。ショートコード除去、shiki でビルド時ハイライト(30 ページ)。
- 日本語 slug の 2 件は出力ディレクトリ名がデコード後の文字列。Phase 7 の `_redirects` 検証で確認する。
- slug `jquery-timeline` の記事がある。`/jquery-timeline/{docs}` と共存する。
- 検証: `pnpm generate` → `pnpm verify:output`(202 件+固定ルートの出力有無、Photon/ショートコード/旧パスの取りこぼし 0 を確認)。`pnpm lint`、`pnpm typecheck` も通る。
- 画像 `/assets/*` はローカルでは解決しない。Phase 7 の Pages Function プロキシで解決する。`/assets/files/*`(zip/po/mo)が manage 側に存在するかは Phase 6 で確認する。
- 現在の UI は最小構成。デザインは Phase 3。

### Phase 2 で判明した事項
- 旧 REST の `wp/v2/posts|pages|docs|categories|tags|media` は未認証で取得でき、`link` は相対パス(`/slug/`)で返る。
- `featured` は `wp/v2` に出ないため、開発中は `scripts/migration-ids.json` の `featured`(13 件)を使う。本番では `register_post_meta` で公開する(Phase 4)。
- 解決: 5 件目 ID 122429 `/docs/jquery-timeline-samples/` は `/jquery-timeline/samples` へ移行する(ユーザー決定)。旧 URL は `_redirects` で 301 する(Phase 7)。

### Phase 1 の成果と注意点
- `frontend/` は Nuxt 4.6.3 + Tailwind 4 + `@vite-pwa/nuxt`。`pnpm dev` / `pnpm generate` / `pnpm lint` / `pnpm typecheck` が使える。
- TypeScript は 5.9 系に固定している。TS 7 は typescript-eslint と vue-tsc が未対応のため上げない。
- pnpm 11 はビルドスクリプトを既定でブロックするため、`frontend/pnpm-workspace.yaml` の `allowBuilds` で `esbuild` と `unrs-resolver` を許可している。
- PWA アイコン(`public/icon-192.png`、`icon-512.png`)は旧 `logo.png`(200px)を拡大した暫定版。Phase 3 で正式なアイコンに差し替える。
- 現在のページはスケルトン(トップとレイアウトのみ)。接続先は `.env.example` の `NUXT_WP_API_BASE`。
- ルート直下の `.gitignore` に `node_modules` 等は不要(`frontend/.gitignore` が担当)。Git にはまだコミットがない。

### 決定済みの重要事項
- 設計の決定事項は [headless-refactoring-design.md](./headless-refactoring-design.md) の 1 章を参照。
- 記事の判断は `.temp/content-inventory.csv`(`decision`、`new_url` 列)。`.temp/_redirects.draft` は下書き。
- 同意前の AdSense は非パーソナライズ広告で出す。
- backend の PHP は本番 8.5.12(CLI は 8.4.27)。開発はローカル 8.4.27 準拠で、シェルでの 8.5 切替はしない。WordPress 最新版(7.1.4)は 8.4/8.5 とも対応。Composer の `config.platform.php` は `8.4` に固定する。

### 注意点
- 旧 WP の認証キーの一部が調査時に端末出力へ露出した。新環境では再生成し、旧値は流用しない。
- 本番サーバーへの書き込みは事前承認が必要。
- `.temp/` は一時用。`content-inventory.csv` と `_redirects.draft` は Phase 2/7 で `docs/` または `frontend/` に昇格させる。

### 未決事項
- docs ID 122429 の移行先は `/jquery-timeline/samples` に決定済み。
- ローカル MySQL(XAMPP)の起動は Phase 4 から必要。Phase 2〜3 は不要(旧 REST を HTTP で参照するため)。
- モックアップ旧パス 5 本の `_redirects` への追加(Phase 7)。
- PHP は 8.4.27 準拠で進める。8.5 の確認は Phase 7 のステージングで行う。

### Phase 4 の申し送り
- ローカル backend: `backend/` で `php -d extension=zip -S localhost:8081 -t public dev-router.php`、管理画面 `http://localhost:8081/wp/wp-admin/`。DB は XAMPP MariaDB 10.4(`ka2_manage`)。管理者の資格情報は `.temp/local-wp-admin.txt`(Git 管理外)。
- `composer install` は CLI の zip 拡張が無効のため `php -d extension=zip` で実行した(php.ini は変更していない)。
- 構成は Bedrock 風: コア `public/wp`、`WP_CONTENT_DIR` は `public/content`、画像は `public/assets/uploads`(URL は `/assets/uploads/...`)。本番の `~/public_html/manage.ka2.org/` へは `public/` の中身を配備する。
- `fetch-content.mjs` は `meta.featured` があればそれを注目記事に使い、無ければ `migration-ids.json` で代用する。
- ローカルの `frontend/.data` は旧サイトのスナップショットのまま(新 backend はテストデータのみのため)。Phase 6 の移行後に `ONLY_MIGRATED=0 pnpm fetch:content` で新 backend へ切り替える。
- 本番の WP クリーンインストール時は、認証キーの再生成、`KA2_DEPLOY_HOOK_URL` の設定、Flamingo の有効化が必要。
- `.env` の接続先を `http://localhost:8081/wp-json` に変更した(`.env.example` も同様)。

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-10-30 | 初版作成。Phase 0 完了 |
| 2026-10-30 | Phase 1 完了(frontend 雛形、generate/lint/typecheck 通過) |
| 2026-10-30 | Phase 2 完了(データ層、ページ生成、本文変換、sitemap/RSS、出力検証) |
| 2026-10-30 | Phase 3 実装完了(レイアウト、同意管理、GA4/AdSense、PWA)。Lighthouse とデザイン調整は残 |
| 2026-10-31 | Phase 4 完了(backend: Composer、mu-plugins、最小テーマ、ローカル接続確認)。Phase 3 は UI 調整・広告枠・Markdown 補完まで実施、Lighthouse は未実施 |
| 2026-10-31 | Phase 5 完了(`ka2-contact.php`、`/contact` フォーム、Turnstile、レート制限、Flamingo 保存)。Phase 3 完了(Lighthouse 計測と改善) |
| 2026-10-31 | Phase 6 完了(`backend/scripts/import-legacy.php`、旧 DB と uploads からローカル backend へ移行し、出力を突合) |
| 2026-10-31 | Phase 7 ローカル実装(_redirects、_headers、画像プロキシ、autoSubfolderIndex: false、GitHub Actions、cloudflare-pages-setup.md) |
| 2026-11-01 | manage-stg.ka2.org を PHP 8.5.12 で構築。DB とコンテンツ(posts 196、pages 1、docs 5、media 286)、uploads を移行し、REST API と local fetch:content を検証。GitHub Actions runner から CoreServer への SSH 自動配備は接続拒否で未解決 |
| 2026-11-01 | Cloudflare Pages の staging 環境変数で再デプロイ。公開 home/contact/sitemap、画像 Function、主要リダイレクト、Turnstile ウィジェットのトークン生成を確認 |
| 2026-11-01 | 公開中の全 redirect 規則(263 静的、7 wildcard)を検証し、削除判定の公開 URL 122 件を網羅。staging 問い合わせ送信・Flamingo 保存を確認しテスト記録を削除。Lighthouse 再計測と dark mode CTA contrast 修正 |
| 2026-11-01 | CTA contrast 修正を `b2a7267` で push し Pages へ反映。contact の Accessibility 100 を再確認。管理者が通知メール受信を確認し、Deploy Hook の POST は HTTP 200 |
| 2026-11-01 | GitHub-hosted runner から CoreServer への SSH が拒否されるため backend 自動配備を停止。Actions workflow と専用 SSH key/Secrets を削除し、staging 配備は手動運用へ |
| 2026-11-01 | Phase 7 完了。staging 環境、Pages 配信、リダイレクト、問い合わせ、Deploy Hook、Lighthouse を検証。backend 配備は手動運用とする |
