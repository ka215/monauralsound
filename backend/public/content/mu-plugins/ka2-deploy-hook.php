<?php
/**
 * Plugin Name: KA2 Deploy Hook
 * Description: 公開状態の変更を検知し、Cloudflare Pages の Deploy Hook を(デバウンス付きで)呼び出す。
 */

defined( 'ABSPATH' ) || exit;

const KA2_DEPLOY_DEBOUNCE = 60; // 秒。連続更新をこの間隔にまとめる
const KA2_DEPLOY_EVENT    = 'ka2_run_deploy_hook';

function ka2_deploy_post_types(): array {
	return array( 'post', 'page', 'docs' );
}

function ka2_schedule_deploy(): void {
	if ( ! defined( 'KA2_DEPLOY_HOOK_URL' ) || ! KA2_DEPLOY_HOOK_URL ) {
		return;
	}
	if ( ! wp_next_scheduled( KA2_DEPLOY_EVENT ) ) {
		wp_schedule_single_event( time() + KA2_DEPLOY_DEBOUNCE, KA2_DEPLOY_EVENT );
	}
}

// 公開・更新・非公開化・削除のいずれかで、公開状態に関わるものだけを対象にする
add_action( 'transition_post_status', static function ( string $new, string $old, WP_Post $post ) {
	if ( ! in_array( $post->post_type, ka2_deploy_post_types(), true ) || wp_is_post_revision( $post ) ) {
		return;
	}
	if ( 'publish' === $new || 'publish' === $old ) {
		ka2_schedule_deploy();
	}
}, 10, 3 );

add_action( 'deleted_post', static function ( int $post_id, WP_Post $post ) {
	if ( in_array( $post->post_type, ka2_deploy_post_types(), true ) && 'publish' === $post->post_status ) {
		ka2_schedule_deploy();
	}
}, 10, 2 );

// カテゴリ・タグの変更も表示に影響する
foreach ( array( 'created_term', 'edited_term', 'delete_term' ) as $hook ) {
	add_action( $hook, static function ( $term_id, $tt_id = 0, $taxonomy = '' ) {
		if ( in_array( $taxonomy, array( 'category', 'post_tag' ), true ) ) {
			ka2_schedule_deploy();
		}
	}, 10, 3 );
}

add_action( KA2_DEPLOY_EVENT, static function () {
	if ( ! defined( 'KA2_DEPLOY_HOOK_URL' ) || ! KA2_DEPLOY_HOOK_URL ) {
		return;
	}
	$res = wp_remote_post( KA2_DEPLOY_HOOK_URL, array( 'timeout' => 10, 'body' => '' ) );
	if ( is_wp_error( $res ) || wp_remote_retrieve_response_code( $res ) >= 400 ) {
		error_log( '[ka2-deploy-hook] failed: ' . ( is_wp_error( $res ) ? $res->get_error_message() : wp_remote_retrieve_response_code( $res ) ) );
	}
} );
