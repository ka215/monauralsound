<?php
// 公開サイトは ka2.org(静的)が担う。このテーマは管理画面のためだけに存在し、閲覧は ka2.org へ転送する。
$front = defined( 'KA2_FRONT_URL' ) ? KA2_FRONT_URL : 'https://ka2.org';
nocache_headers();
header( 'X-Robots-Tag: noindex, nofollow' );
wp_redirect( untrailingslashit( $front ) . wp_unslash( $_SERVER['REQUEST_URI'] ?? '/' ), 302 ); // phpcs:ignore WordPress.Security
exit;
