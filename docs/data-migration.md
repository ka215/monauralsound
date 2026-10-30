---
title: データ移行手順
purpose: 旧 manage.ka2.org から新 backend へコンテンツ・画像・問い合わせデータを移行する手順と結果を記録する
status: active
related:
  - ./development-plan.md
  - ./backend-setup.md
  - ./progress-tracker.md
---

# データ移行手順

旧 DB(`ka2_ms`、接頭辞 `ms_`)は読み取りのみ行い、ローカルで取り込んだ結果を新 backend の初期データとする。

## 手順(ローカル)

1. 旧 DB のダンプを読み取り専用で取得する(必要テーブルのみ)。認証情報はサーバー上で `wp-config.php` から読み、端末には表示しない。
   - 対象: `ms_posts`、`ms_postmeta`、`ms_terms`、`ms_term_taxonomy`、`ms_term_relationships`、`ms_termmeta`
   - ダンプには MariaDB 10.6 のサンドボックスモード行(先頭行)があるため、XAMPP 10.4 の `mysql` で読む前に削除する。
2. ローカルの検証用スキーマ `ka2_legacy` へ取り込む。
3. 旧 `uploads`(約 190MB)を `.temp/uploads-pull/` へ取得する(`ssh ... tar cf - .` を `tar xf -` へパイプ)。
4. 旧 REST が返していたレンダリング済み本文のスナップショットを `.temp/legacy-snapshot/` に置く(旧 `frontend/.data`)。
5. `backend/` で取り込みスクリプトを実行する。

   ```
   KA2_IMPORT_WIPE=1 php -d memory_limit=1024M vendor/wp-cli/wp-cli/php/boot-fs.php --path=public/wp eval-file scripts/import-legacy.php
   ```

   `KA2_IMPORT_DRY=1` で書き込みなしの件数確認ができる。環境変数の一覧は [import-legacy.php](../backend/scripts/import-legacy.php) の冒頭コメントを参照。
6. `NUXT_WP_API_BASE=http://localhost:8081/wp-json ONLY_MIGRATED=0 pnpm fetch:content` で新 backend から取得し、`pnpm generate` と `pnpm verify:output` で確認する。

## 方針

- 移行対象は `frontend/scripts/migration-ids.json` の ID(投稿 196、固定ページ 1、docs 5)。旧 ID を維持する。
- 本文は旧 REST のレンダリング済み HTML を使う。旧原文は Jetpack Markdown のため、DB の `post_content` は使わない。
  - 再度の `wpautop` を避けるため、`<!-- wp:html -->` ブロックで保持する。
  - `ka2.org` / `i0.wp.com` / `wp-content` 等の画像 URL は `/assets/uploads/...` に正規化する。
- 画像は、本文で参照されるものとアイキャッチのみ登録・配置する(添付 267 件)。メタデータ(サイズ違い)は旧データを引き継ぐ。
- 注目記事は旧 `featured` メタ(13 件)を `meta.featured` に引き継ぐ。
- Flamingo は `flamingo_contact` 13 件、`flamingo_inbound` 5 件をメタ・チャンネルごと複製する。
- コメント、下書き、非公開、bbPress、統計は移行しない。

## 結果(ローカル)

- 投稿 196、固定ページ 1、docs 5、添付 267、Flamingo 18 を登録した。
- 旧サイト用に生成した 224 ページと新 backend から生成した出力を比較し、本文は一致した。差分は次のとおり。
  - 抜粋が自動生成のものは、WordPress 標準の生成に変わる(手動の抜粋 66 件は維持)。
  - `<img>` に `width`/`height` が付与される。
  - 1 件のスラッグから不可視文字(U+200B 2 つ)が除かれた。旧 URL からの 301 を `_redirects` に追加する(下書き `.temp/_redirects.draft` に記載済み)。
- 参照画像 1,145 件のうち、旧サイトでも存在しない 2 件(`2015/09/sample-1.jpg`、`2015/09/android_and_html5.png`、投稿 31723)を除き、すべて配置済み。

## 本番への反映(Phase 8)

1. 新環境(クリーンインストール)へ、ローカルで取り込み済みの DB を `wp db export` でエクスポートして取り込む。または新環境で本スクリプトを再実行する。
2. `backend/public/assets/uploads/` を本番の `assets/uploads/` へ rsync する。
3. サイト URL(`home`/`siteurl`)を `wp search-replace` で本番値へ置換する。
4. 旧 DB の資格情報や認証キーは流用しない。
