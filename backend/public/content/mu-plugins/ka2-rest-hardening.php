<?php
/**
 * Plugin Name: KA2 REST Hardening
 * Description: 未認証の REST を、フロントのビルドに必要な読み取り系だけに絞る。
 */

defined( 'ABSPATH' ) || exit;

// 未認証で許可するルート(users、comments、settings 等は遮断)
const KA2_PUBLIC_REST_ROUTES = '#^(?:/|/wp/v2|/wp/v2/(?:posts|pages|categories|tags|media|docs|types|taxonomies)(?:/.*)?|/ka2/v1(?:/.*)?)$#';

add_filter( 'rest_endpoints', static function ( array $endpoints ): array {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}
	foreach ( array_keys( $endpoints ) as $route ) {
		if ( ! preg_match( KA2_PUBLIC_REST_ROUTES, $route ) ) {
			unset( $endpoints[ $route ] );
		}
	}
	return $endpoints;
} );

// 不要なヘッダ・機能の無効化
add_action( 'init', static function () {
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_generator' );
} );
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'wp_sitemaps_enabled', '__return_false' );
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
