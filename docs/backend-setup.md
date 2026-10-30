# backend ローカル環境と構成

manage.ka2.org(ヘッドレス CMS 用 WordPress)の構成と、ローカルでの構築・起動手順。

## 構成

```
backend/
  composer.json / composer.lock   WP コア 7.1.4、Flamingo、wp-cli(dev)を固定。config.platform.php は 8.4
  dev-router.php                  ローカル専用ルーター(php -S 用)
  public/                         ドキュメントルート
    index.php                     コア(/wp)を読み込む
    wp-config.php                 環境ごとに用意(Git 管理外)。雛形は wp-config.sample.php
    wp/                           WP コア(Composer 管理、Git 管理外)
    content/
      mu-plugins/                 自作コード(Git 管理)
      themes/ka2-admin/           最小テーマ(公開表示は ka2.org へ 302)
      plugins/                    Composer 管理(Flamingo)
    assets/uploads/               アップロード画像(Git 管理外。URL は /assets/uploads/...)
```

### mu-plugins

| ファイル | 役割 |
|---|---|
| `ka2-content-model.php` | `docs` 投稿タイプ(階層、`/wp/v2/docs`)、`meta.featured`(注目記事)とその編集メタボックス、アップロード先を `/assets/uploads` に変更 |
| `ka2-rest-hardening.php` | 未認証の REST を `posts/pages/categories/tags/media/docs/types/taxonomies` と `ka2/v1` のみに制限(`users`、`comments`、`settings` 等は 404)。XML-RPC、コメント、wp-sitemap を無効化 |
| `ka2-deploy-hook.php` | 公開・更新・非公開化・削除、カテゴリ/タグ変更で Deploy Hook を呼ぶ。60 秒のデバウンス(WP-Cron の単発イベントを 1 つだけ登録) |

wp-config.php の定数: `KA2_DEPLOY_HOOK_URL`(未設定なら呼ばない)、`KA2_FRONT_URL`(既定 `https://ka2.org`)。Phase 5 で `KA2_TURNSTILE_SECRET`、`KA2_ALLOWED_ORIGINS` を追加する。

## ローカル構築(初回)

前提: XAMPP の MariaDB(10.4)と PHP 8.4。PHP のバージョンは切り替えない。

1. MariaDB を起動し、DB を作る: `CREATE DATABASE ka2_manage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. 依存を入れる(CLI の PHP は zip 拡張が無効のため、実行時だけ有効にする):
   `php -d extension=zip <composer.phar> install`(`backend/` で実行)
3. `public/wp-config.sample.php` を `public/wp-config.php` にコピーし、DB 接続、`WP_HOME`(`http://localhost:8081`)、認証キー(公開 API で生成)を設定する。
4. インストール: `php vendor/wp-cli/wp-cli/php/boot-fs.php --path=public/wp core install --url=http://localhost:8081 ...`
5. 設定: テーマ `ka2-admin` を有効化、パーマリンク `/%postname%/`、タイムゾーン `Asia/Tokyo`、Flamingo を有効化。

## 起動

```
cd backend
php -d extension=zip -S localhost:8081 -t public dev-router.php
```

管理画面は `http://localhost:8081/wp/wp-admin/`。frontend は `frontend/.env` の `NUXT_WP_API_BASE=http://localhost:8081/wp-json` を参照し、`pnpm fetch:content`(`ONLY_MIGRATED=0`)で取得する。

## 本番との差分

- 本番は PHP 8.5.12、Apache の `public/.htaccess`。コア・プラグインは GitHub Actions が `composer install` して配備する(Phase 7)。
- `wp-config.php` と `assets/uploads/` は配備の `--delete` 対象から除外する。
- 本番の `wp-config.php` は認証キーを必ず再生成し、`DISALLOW_FILE_MODS` を有効にする(サンプルは true)。

## 問い合わせ API(Phase 5)

- mu-plugin: `ka2-contact.php`(`POST /wp-json/ka2/v1/contact`。検証、ハニーポット、Origin、レート制限、Turnstile、Flamingo 保存、通知)。
- wp-config の定数: `KA2_TURNSTILE_SECRET`(本番は本物)、`KA2_ALLOWED_ORIGINS`(既定 `https://ka2.org`)、`KA2_CONTACT_TO`(既定は管理者メール)。
- frontend: `NUXT_PUBLIC_CONTACT_API`、`NUXT_PUBLIC_TURNSTILE_SITE_KEY`。

