<?php
// ローカル/本番ごとに個別に用意する(Git 管理外)。雛形は wp-config.sample.php。
define( 'DB_NAME', 'database_name' );
define( 'DB_USER', 'username' );
define( 'DB_PASSWORD', 'password' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );
$table_prefix = 'wp_';

// https://api.wordpress.org/secret-key/1.1/salt/ で生成した値に置き換える
define( 'AUTH_KEY', 'put your unique phrase here' );
define( 'SECURE_AUTH_KEY', 'put your unique phrase here' );
define( 'LOGGED_IN_KEY', 'put your unique phrase here' );
define( 'NONCE_KEY', 'put your unique phrase here' );
define( 'AUTH_SALT', 'put your unique phrase here' );
define( 'SECURE_AUTH_SALT', 'put your unique phrase here' );
define( 'LOGGED_IN_SALT', 'put your unique phrase here' );
define( 'NONCE_SALT', 'put your unique phrase here' );

// コアは /wp、wp-content は /content に分離している
define( 'WP_HOME', 'https://manage.ka2.org' );
define( 'WP_SITEURL', WP_HOME . '/wp' );
define( 'WP_CONTENT_DIR', __DIR__ . '/content' );
define( 'WP_CONTENT_URL', WP_HOME . '/content' );

define( 'WP_ENVIRONMENT_TYPE', 'production' );
define( 'WP_DEBUG', false );
define( 'DISALLOW_FILE_EDIT', true );
define( 'DISALLOW_FILE_MODS', true );
define( 'WP_POST_REVISIONS', 5 );
define( 'AUTOMATIC_UPDATER_DISABLED', true );

// Cloudflare Pages の Deploy Hook URL(未設定なら再ビルドを呼ばない)
// define( 'KA2_DEPLOY_HOOK_URL', 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...' );
// Cloudflare Turnstile のシークレット(必須。未設定だと問い合わせは常に拒否される)
// define( 'KA2_TURNSTILE_SECRET', '' );
// 許可する CORS オリジン(カンマ区切り。既定は https://ka2.org)
// 通知メールの宛先(既定は管理者メール): define( 'KA2_CONTACT_TO', 'you@example.com' );
// define( 'KA2_ALLOWED_ORIGINS', 'https://ka2.org,http://localhost:3000' );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/wp/' );
}
require_once ABSPATH . 'wp-settings.php';