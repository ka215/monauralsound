<?php
/**
 * Plugin Name: KA2 Content Model
 * Description: docs 投稿タイプ、注目記事(featured)メタ、アップロード先(/assets/uploads)を定義する。
 */

defined( 'ABSPATH' ) || exit;

// 技術ドキュメント(/jquery-timeline/... に静的出力する)。REST は /wp/v2/docs
add_action( 'init', static function () {
	register_post_type( 'docs', array(
		'labels'       => array(
			'name'          => 'ドキュメント',
			'singular_name' => 'ドキュメント',
			'add_new_item'  => 'ドキュメントを追加',
			'edit_item'     => 'ドキュメントを編集',
		),
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => true,
		'show_in_rest' => true,
		'rest_base'    => 'docs',
		'hierarchical' => true,
		'has_archive'  => false,
		'rewrite'      => false,
		'menu_icon'    => 'dashicons-media-document',
		'supports'     => array( 'title', 'editor', 'excerpt', 'page-attributes', 'revisions', 'custom-fields' ),
	) );

	// 注目記事。REST では meta.featured として公開する
	register_post_meta( 'post', 'featured', array(
		'type'              => 'boolean',
		'single'            => true,
		'default'           => false,
		'show_in_rest'      => true,
		'sanitize_callback' => 'rest_sanitize_boolean',
		'auth_callback'     => static fn () => current_user_can( 'edit_posts' ),
	) );
} );

// クラシック/ブロック両エディタで使えるように、メタボックスで切り替える
add_action( 'add_meta_boxes_post', static function () {
	add_meta_box( 'ka2-featured', '注目記事', static function ( WP_Post $post ) {
		wp_nonce_field( 'ka2_featured', 'ka2_featured_nonce' );
		printf(
			'<label><input type="checkbox" name="ka2_featured" value="1" %s> トップの「注目」タブに表示する</label>',
			checked( (bool) get_post_meta( $post->ID, 'featured', true ), true, false )
		);
	}, 'post', 'side' );
} );

add_action( 'save_post_post', static function ( int $post_id ) {
	if ( ! isset( $_POST['ka2_featured_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ka2_featured_nonce'] ) ), 'ka2_featured' ) ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	update_post_meta( $post_id, 'featured', ! empty( $_POST['ka2_featured'] ) );
} );

// 画像は ka2.org/assets/uploads/... として配信する(フロントの URL 正規化と揃える)
add_filter( 'upload_dir', static function ( array $dirs ): array {
	$base = dirname( WP_CONTENT_DIR ) . '/assets/uploads';
	$url  = untrailingslashit( WP_HOME ) . '/assets/uploads';

	$dirs['basedir'] = $base;
	$dirs['baseurl'] = $url;
	$dirs['path']    = $base . $dirs['subdir'];
	$dirs['url']     = $url . $dirs['subdir'];
	return $dirs;
} );
