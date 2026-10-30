# Cloudflare Pages 設定と CI/CD(Phase 7)

frontend は Cloudflare Pages(Git 連携ビルド)、backend は GitHub Actions + rsync で配備する。
本番側の作成・登録は、承認を得てから行う。

## Cloudflare Pages プロジェクト

| 項目 | 値 |
| --- | --- |
| Git リポジトリ | 本リポジトリ(production branch: `main`) |
| ルートディレクトリ | `frontend` |
| ビルドコマンド | `pnpm fetch:content && pnpm generate` |
| 出力ディレクトリ | `.output/public` |
| Node.js | 24(環境変数 `NODE_VERSION=24`) |

### 環境変数(Production / Preview)

| 名前 | 値 |
| --- | --- |
| `NUXT_WP_API_BASE` | `https://manage.ka2.org/wp-json`(ステージングも同じ) |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile のサイトキー |
| `NUXT_PUBLIC_CONTACT_API` | 問い合わせ API の URL(未指定なら既定値) |
| `NUXT_PUBLIC_ADSENSE_DEBUG` | `false` |
| `ASSETS_ORIGIN` | 省略可。画像プロキシの取得元(既定 `https://manage.ka2.org`) |

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
- `backend-deploy.yml`: `main` への backend 変更で、構文検査 → `composer install --no-dev` → rsync。
  - `wp-config.php` と `assets/uploads/` は同期・削除の対象外。
  - 必要な Secrets: `DEPLOY_SSH_KEY`(専用鍵)、`DEPLOY_KNOWN_HOSTS`、`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PATH`(`~/public_html/manage.ka2.org` 相当)。
  - 専用鍵は CoreServer の `authorized_keys` に登録する。可能なら rsync 専用に制限する。

## ローカル検証(wrangler)

```
cd frontend
pnpm fetch:content && pnpm generate
npx wrangler@4 pages dev .output/public --port 8788 --binding ASSETS_ORIGIN=http://localhost:8081
```

確認済み: 末尾スラッシュなしで 200、`/x/` は `/x` へ 308、`/cdbt` はカテゴリ表示で `/cdbt/*` は `/` へ 301、画像と `files/` は 200(正しい Content-Type)、PHP・`..`・存在しない画像は 404。

## ステージング検証チェックリスト(要承認)

- [ ] Pages プロジェクト作成と初回ビルド成功
- [ ] 全リダイレクト(`.temp/content-inventory.csv` の削除記事を含む)
- [ ] PHP 8.5 での backend 動作
- [ ] Deploy Hook の実呼び出し
- [ ] 実 Turnstile と実メール送信
- [ ] Lighthouse 再計測(best-practices の画像 404 解消)
