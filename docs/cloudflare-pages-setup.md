# Cloudflare Pages 設定と CI/CD(Phase 7)

frontend は Cloudflare Pages(Git 連携ビルド)、backend は CoreServer の `manage-stg.ka2.org` へ配備する。
本番の `manage.ka2.org` と `ka2.org` は Phase 8 まで変更しない。

## Cloudflare Pages プロジェクト

| 項目 | 値 |
| --- | --- |
| Git リポジトリ | 本リポジトリ(production branch: `main`) |
| ルートディレクトリ | `frontend` |
| ビルドコマンド | `pnpm fetch:content && pnpm generate` |
| 出力ディレクトリ | `.output/public` |
| デプロイコマンド | 設定しない(Pages はビルド出力を自動配信。`npx wrangler deploy` は Workers 用) |
| Node.js | 24(環境変数 `NODE_VERSION=24`) |

### 環境変数(Production / Preview)

| 名前 | 値 |
| --- | --- |
| `NUXT_WP_API_BASE` | `https://manage-stg.ka2.org/wp-json` |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile のサイトキー |
| `NUXT_PUBLIC_CONTACT_API` | `https://manage-stg.ka2.org/wp-json/ka2/v1/contact` |
| `NUXT_PUBLIC_ADSENSE_DEBUG` | `false` |
| `ASSETS_ORIGIN` | `https://manage-stg.ka2.org` |

`ONLY_MIGRATED` は設定しない(新 backend は全件が配信対象)。

## 配信まわり(`frontend/public` と `frontend/functions`)

- `_redirects`: 旧 URL の 301(削除記事 → `/`、docs、モックアップ、不可視文字スラッグ)。
- `_headers`: セキュリティヘッダとキャッシュ。fetch 系の CSP は AdSense を壊すため付けない。
- `functions/assets/[[path]].ts`: `/assets/*` を manage 側 uploads へプロキシ(許可拡張子のみ、GET/HEAD のみ)。R2 移行時はここだけ差し替える。
- `nitro.prerender.autoSubfolderIndex: false`: `x.html` で出力し、`/x`(末尾スラッシュなし)で配信する。canonical と一致する。

## 自動再ビルド(Deploy Hook)

1. Pages の Settings → Builds → Deploy hooks で hook を作成する。
2. backend の `wp-config.php` に `KA2_DEPLOY_HOOK_URL` として定義する(mu-plugin `ka2-deploy-hook`)。

## Turnstile

Cloudflare の Turnstile ウィジェットのホスト名に `ka2.org`、`*.pages.dev`(検証用)、`localhost` を追加する。

## GitHub Actions

- `frontend-ci.yml`: frontend 配下の変更で lint と typecheck。
- `backend-deploy.yml`: `main` への backend 変更で、構文検査 → `composer install --no-dev` → rsync。GitHub-hosted runner から CoreServer への SSH 接続が拒否されたため、自動配備は未検証。
  - `wp-config.php` と `assets/uploads/` は同期・削除の対象外。
  - Secrets: `DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`、`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PATH`(`manage-stg.ka2.org`)を登録済み。
  - CoreServer では専用公開鍵に `restrict` を付けて `authorized_keys` に登録済み。

## ローカル検証(wrangler)

```
cd frontend
pnpm fetch:content && pnpm generate
npx wrangler@4 pages dev .output/public --port 8788 --binding ASSETS_ORIGIN=http://localhost:8081
```

確認済み: 末尾スラッシュなしで 200、`/x/` は `/x` へ 308、`/cdbt` はカテゴリ表示で `/cdbt/*` は `/` へ 301、画像と `files/` は 200(正しい Content-Type)、PHP・`..`・存在しない画像は 404。

## ステージング検証チェックリスト

- [x] Pages プロジェクト作成(`monauralsound.pages.dev`)
- [x] CoreServer staging 構築(PHP 8.5、独立 DB、移行済みコンテンツ、uploads)
- [x] staging REST API の取得(posts 196、pages 1、docs 5、media 286)
- [x] Pages の環境変数を staging URL に変更して再ビルド(home/contact、sitemap、robots が 200)
- [x] リダイレクトの公開確認(263 件の静的規則と 7 件の wildcard 規則を検証。削除判定の公開記事 122 件すべてに規則があり、内部転送先 7 件も 200)
- [x] PHP 8.5.12 での backend / DB 動作
- [x] Deploy Hook を staging WordPress から実行し、Cloudflare が HTTP 200 で受理
- [x] Turnstile のトークン生成と staging 問い合わせ API の送信、Flamingo 保存、通知メールの受信を確認。テスト記録は削除済み
- [~] Lighthouse(Performance/Accessibility/Best Practices/SEO): home mobile 96/100/77/100、desktop 98/100/77/100。Contact は修正を Pages に反映後 76/100/77/100。ローカル計測では 98/100/77/100。Best Practices の third-party cookie は AdSense 由来。Contact の LCP は 4.1 秒で引き続き調査余地あり
