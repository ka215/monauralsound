---
title: ka2.org ヘッドレス再構築 設計
purpose: ka2.org(Nuxt4 SSG / Cloudflare Pages)と manage.ka2.org(WordPress)の再構築方針を定義する
status: draft
---

# ka2.org ヘッドレス再構築 設計

## 1. 決定事項

| 項目 | 決定 |
|---|---|
| フロント | Nuxt 4 完全SSG、Cloudflare Pages 配信、PWA、モバイルファースト |
| CSS | TailwindCSS(Vuetify は不採用) |
| CMS | manage.ka2.org(WordPress 最新版をクリーンインストール) |
| API | WP 標準 REST(`wp/v2`)。自作 `monauralsound/v4` は廃止 |
| 問い合わせ | 自作 mu-plugin の最小エンドポイント + Flamingo 保存。CF7 は廃止 |
| スパム対策 | Cloudflare Turnstile |
| 再ビルド | 公開・更新・削除で Cloudflare Pages Deploy Hook を自動呼び出し |
| 画像 | 当面 manage 側で配信。`ka2.org/assets/*` は Pages Functions で manage へプロキシ(URL 維持)。R2 は後続 |
| 破棄 | 統計データ、bbPress、コメント、下書き、非公開、ショートコード |
| URL 正規形 | 末尾スラッシュなし。スラッシュ有無は同一視(canonical は無し側) |
| モックアップ | `https://magic-methods.ka2.org/mockup/{name}/` への直接リンク。旧パスは 301 |
| GA4 / AdSense | 既存 ID を継承。同意状態は localStorage に保存。同意前は GA4 を読み込まず、AdSense は非パーソナライズ広告で出す |
| バックアップ | DB は CoreServer の日次 dump(15 世代)。コードは GitHub から再配備してロールバック |
| backend 実行環境 | 本番 PHP 8.5.12(CLI は 8.4.27)。開発はローカル 8.4.27 準拠(他プロジェクトへの影響を避けるため切替しない)。WordPress 7.1 系は PHP 8.4 / 8.5 ともに対応(公式互換表)。Composer の `config.platform.php` を `8.4` に固定する。8.5 での動作はステージングで確認する |
| デザイン | 現行をベースにモバイルファースト刷新。ヘッダのログイン導線は除却 |
| リポジトリ | モノレポ。`frontend/`(Nuxt 4)と `backend/`(manage.ka2.org の WordPress) |
| 配備 | frontend は Cloudflare Pages の GitHub 連携(Deploy Hook でも再ビルド)。backend は GitHub Actions から SSH(rsync)で CoreServer へ |

移行対象コンテンツは `.temp/content-inventory.csv` の判断欄が正(移行 202 件 / 削除 175 件)。

## 2. 全体構成

```
[WP manage.ka2.org] --(wp/v2 REST, ビルド時のみ)--> [Nuxt build] --> [Cloudflare Pages]
        ^                                                                  |
        |  Deploy Hook(save_post / trash)                                  |
        +--- POST /wp-json/ka2/v1/contact  <-- ブラウザ(Turnstile トークン付き)
        +--- ka2.org/assets/* <-- Pages Functions プロキシ <-- ブラウザ
```

- 閲覧時にブラウザは WP へアクセスしない(問い合わせ送信と画像のみ)。
- manage.ka2.org は管理専用とし、公開 REST は GET を `wp/v2` の必要範囲に絞る。

## 3. フロントエンド(Nuxt 4)

- `nuxt generate` による全ページ静的生成。`nitro.prerender` のルートはビルド時に REST から生成する。
- モジュール: `@nuxtjs/tailwindcss`(または Tailwind v4 の Vite プラグイン)、`@vite-pwa/nuxt`、`@nuxt/content` は不使用(データ源は WP)。
- ページ種別:
  - `/` 一覧(新着・featured)、カテゴリ一覧 `/{category}/`、記事 `/{slug}/`、固定ページ `/privacy-policy/`、`/contact/`
  - docs 残置分は `/jquery-timeline/{slug}/`(旧 `/docs/...` から 301)
- URL は末尾スラッシュなしを正規形とする(`trailingSlash: false`)。Cloudflare Pages は `/x/` を `/x` に正規化して配信する。移行対象 202 件に、正規化後の URL 衝突はない。slug に日本語のパーセントエンコードを含む 2 件(ID 106、19288)は、ビルド時のファイル名と `_redirects` の一致を検証する。
- 注目記事(`featured`)は REST で公開してビルド時に取得する。関連記事はカテゴリ/タグの重なりでビルド時に計算し、静的 HTML として出力する。閲覧数に基づく表示は行わない。
- ヘッダにログイン導線は置かない。
- SEO: 記事ごとの title / description / OGP / canonical を SSG 時に HTML へ出力。`sitemap.xml`・`robots.txt`・RSS を生成(現在の sitemap プラグインを代替)。
- PWA: manifest、アイコン、オフラインフォールバック、Service Worker は stale-while-revalidate。記事本文は precache せず runtime cache。
- モバイルファースト: Tailwind のブレークポイントは小画面基準で記述。ナビはボトムナビまたはドロワー。画像は `loading="lazy"` と `srcset`(WP の生成サイズを利用)。
- アナリティクス/広告: GA(GA4)と AdSense は既存 ID を継続し、同意管理(Cookie Policy ページあり)の扱いを実装時に確認する。
- 本文は WP の HTML をそのまま描画。ビルド時に次の変換を行う: ショートコード残骸の除去、`ka2.org/assets/...` と `wp-content/uploads` 参照の正規化、wp.com 画像の元 URL 化、コードブロックの highlight.js(または Shiki)適用。

## 4. CMS(manage.ka2.org)

- WP 最新版をクリーンインストール。DB は新規に作成し、移行対象の post/page と画像、flamingo 問い合わせのみインポートする。
- 残すプラグイン: Flamingo、必要最小限の mu-plugin(Deploy Hook、問い合わせ API、`featured` の REST 公開)。Jetpack、CF7、Akismet(今回はTurnstileを採用)、amp、旧テーマ等は除却。
- テーマ: 管理用の最小テーマ(または空テーマ)。フロントは持たず、`/` へのアクセスは 403 または ka2.org へリダイレクト。
- `WP_DEBUG` は本番で false。ログ(wp-slow.log、debug.log、msmt.log)は新環境で作らない。
- 認証キー/ソルトは新規生成する(旧値は出力に露出したため流用しない)。
- ユーザーは必要なもののみ。ログインは `/wp-login.php` を維持しつつ、レート制限と 2FA を検討する。

### REST の公開範囲

- `wp/v2/posts`、`categories`、`tags`、`media`、`pages` の GET のみ公開。
- `register_post_meta('post', 'featured', ['show_in_rest' => true])` で featured を公開。
- `users`、`comments`、`wp/v2/settings`、`search` 等は未認証アクセスを遮断(現状 `wp/v2/users` が公開されている)。

### 問い合わせ API(mu-plugin)

- `POST /wp-json/ka2/v1/contact`: name、email、subject、message、`turnstile_token`。
- 処理: 入力検証 → Turnstile サーバー検証 → レート制限 → `flamingo_inbound` に保存 → 管理者へ通知メール。
- CORS は `https://ka2.org` のみ許可。保存失敗とスパム拒否を区別して返す。
- Flamingo 既存データ(contact 13 件、inbound 5 件)は WXR または SQL 抽出で新環境へインポートする。

### Deploy Hook

- `transition_post_status` と `deleted_post` で Cloudflare Pages の Deploy Hook(URL は wp-config の定数または環境変数)を呼ぶ。
- 連続編集で多重ビルドにならないよう、数分のデバウンス(トランジェントで抑止)を入れる。

## 5. Cloudflare Pages

- `_redirects`: `.temp/_redirects.draft` を基に確定(削除記事 → `/` 301、docs 4 件の移動、`/mhr`)。
- `functions/assets/[[path]].ts`: `manage.ka2.org/assets/uploads/...` へプロキシし、キャッシュヘッダーを付与する。
- `_headers`: セキュリティヘッダー(CSP、X-Content-Type-Options 等)と静的資産のキャッシュ。
- ビルド環境: Node.js をビルド時のみ使用(サーバー側には不要)。

## 6. 旧環境の扱い

- 切替までは現行環境を維持し、`stg` ホスト名で新フロントを並行検証する。
- 切替時: DNS を Cloudflare Pages へ向ける → 旧 `ka2.org/apps`(WP)、`msfe_` DB、旧テーマ、`.git` の公開ディレクトリを撤去。
- モックアップは `https://magic-methods.ka2.org/mockup/{name}/` へ直接リンクとする。`_redirects` で旧パスを 301 にする。
  - `/jqtl-v1` → `jqtl_v1`
  - `/jqtl-v2` → `jqtl_v2`
  - `/sloth-docs` → `sloth`
  - `/sunorhc` → `sunorhc`
  - `/svg-japan-demo` → `svg-japan`
- 事前に全 DB・`uploads` のフルバックアップを取得する。

## 7. 実装フェーズ案

1. リポジトリ初期化: Nuxt4 + Tailwind + PWA の雛形、WP REST の取得層(型定義付き)。
2. データ取得とページ生成: 記事/一覧/カテゴリ/固定ページ、コンテンツ変換、SEO、sitemap/RSS。
3. 問い合わせ: mu-plugin、Turnstile、フォーム UI。
4. 新 WP 構築: クリーンインストール、データ移行、REST 公開範囲の絞り込み、Deploy Hook。
5. Pages 設定: `_redirects`、画像プロキシ、ステージング検証。
6. 本番切替と旧環境撤去。

## 8. リポジトリとリリース

```
ka2.org/
  frontend/   Nuxt 4 プロジェクト
  backend/    manage.ka2.org の WordPress(本体は Composer で固定)
  docs/
  .github/workflows/
```

- backend は WP 本体も含めてリポジトリ管理する。コアとプラグインは Composer(例: `johnpbloch/wordpress`)でバージョン固定し、`mu-plugins` は自作コードをコミットする。
- コミットしないもの: `wp-config.php`、`uploads`、DB。機密値は GitHub Secrets と、サーバー上の設定ファイルで管理する。
- frontend: Cloudflare Pages の GitHub 連携でビルド・配備する。`main` を本番、PR をプレビューとする。WP の Deploy Hook でも再ビルドする。
- backend: GitHub Actions が `composer install` 後に SSH(rsync)で CoreServer の `~/public_html/manage.ka2.org/` へ配備する。`--delete` の対象から `uploads` と `wp-config.php` を除外する。
- backend の配備前チェック: PHP 構文検査と、ロールバック用の前回リリース保持。
- 配備用 SSH 鍵は専用鍵とし、権限を最小化する。

## 9. 未決事項

- モックアップ旧パス 5 本の `_redirects` への追加(Phase 7)。
- (解決済み)PHP は 8.4.27 準拠で開発し、8.5 はステージングで確認する。

## 10. 関連文書

- [development-plan.md](./development-plan.md): フェーズ別の開発計画
- [progress-tracker.md](./progress-tracker.md): 進捗と申し送り
