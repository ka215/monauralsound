# Cloudflare Pages 設定と CI/CD(Phase 7)

frontend は Cloudflare Pages(Git 連携ビルド)で配信し、backend は CoreServer の本番 `manage.ka2.org` と staging `manage-stg.ka2.org` を使う。
Cloudflare の `ka2.org` Zone は有効で、Value-Domain の nameserver は `connie.ns.cloudflare.com` / `sage.ns.cloudflare.com`。2026-11-02 時点で `.org` 権威 DNS と Cloudflare DNS、`1.1.1.1`、`8.8.8.8` は新 NS を返す。Cloudflare の権威 DNS 2台は apex/www の Pages 向け応答、`mail.ka2.org` の MX、CoreServer 向け A を返す。15 件の DNS レコードとメール関連 TXT を確認済み。Pages Production の backend URL は本番へ切替・再デプロイ済み。`ka2.org` / `www.ka2.org` は Pages カスタムドメインとして登録され、両方の HTTPS とトップが HTTP 200、sitemap全221 URLも HTTP 200 であることを外部確認済み。

## Phase 8 DNS 準備状況

| 種別 | 名前 | 設定 | 状態 |
| --- | --- | --- | --- |
| A | `amp`、`exam`、`famie`、`mail`、`*` | CoreServer、DNS only、TTL 1 時間 | 準備済み |
| CNAME | `@`、`www` | `monauralsound.pages.dev`、プロキシ有効 | 準備済み |
| MX | `@` | `mail.ka2.org`、優先度 10、TTL 1 時間 | 準備済み |
| TXT | apex | SPF、DKIM、DMARC、OpenAI ドメイン検証 | 準備済み |
| TXT | `famie` | SPF、DKIM、DMARC | 準備済み |

`manage` と `manage-stg` は wildcard A で CoreServer を引き続き参照する。Pages の apex/www カスタムドメインは HTTPS で稼働確認済み。

DNSSEC は `1.1.1.1` / `8.8.8.8` への DS 問い合わせでレコードなしを確認。古い DS による切替後の検証失敗は確認されていない。

## Cloudflare Pages プロジェクト

| 項目 | 値 |
| --- | --- |
| Git リポジトリ | 本リポジトリ(production branch: `main`) |
| ルートディレクトリ | `frontend` |
| ビルドコマンド | `pnpm fetch:content && pnpm generate` |
| 出力ディレクトリ | `.output/public` |
| デプロイコマンド | 設定しない(Pages はビルド出力を自動配信。`npx wrangler deploy` は Workers 用) |
| Node.js | 24(環境変数 `NODE_VERSION=24`) |

### 環境変数

Production は本番 backend、Preview は staging backend を参照する。

| 名前 | Production | Preview |
| --- | --- | --- |
| `NUXT_WP_API_BASE` | `https://manage.ka2.org/wp-json` | `https://manage-stg.ka2.org/wp-json` |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile のサイトキー | Turnstile のサイトキー |
| `NUXT_PUBLIC_CONTACT_API` | `https://manage.ka2.org/wp-json/ka2/v1/contact` | `https://manage-stg.ka2.org/wp-json/ka2/v1/contact` |
| `NUXT_PUBLIC_ADSENSE_DEBUG` | `false` | `false` |
| `ASSETS_ORIGIN` | `https://manage.ka2.org` | `https://manage-stg.ka2.org` |

`NODE_VERSION=24`。`ONLY_MIGRATED` は設定しない(新 backend は全件が配信対象)。Production の3つの backend URL は設定・再デプロイ済み。Contact の HTML に本番 URL が含まれ、staging URL が含まれないこと、および本番 WordPress REST API が HTTP 200 であることを確認済み。

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
- backend は GitHub-hosted runner から CoreServer への SSH が接続拒否されたため、自動配備しない。検証済み変更をローカルから手動配備し、`wp-config.php` と `assets/uploads/` は保持する。専用 Actions workflow は停止・削除済み。

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
