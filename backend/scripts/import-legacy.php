<?php
/**
 * 旧 manage.ka2.org の DB ダンプ(ローカルの検証用 DB)から、移行対象のコンテンツを新 WordPress へ取り込む。
 *
 * 実行例(backend/ で):
 *   php -d memory_limit=512M vendor/wp-cli/wp-cli/php/boot-fs.php --path=public/wp eval-file scripts/import-legacy.php
 *
 * 環境変数:
 *   KA2_LEGACY_DB     旧 DB を取り込んだスキーマ名(既定 ka2_legacy)
 *   KA2_LEGACY_USER / KA2_LEGACY_PASS / KA2_LEGACY_HOST  接続情報(既定 root / 空 / localhost)
 *   KA2_LEGACY_PREFIX 旧テーブル接頭辞(既定 ms_)
 *   KA2_LEGACY_UPLOADS 旧 uploads の取得先ディレクトリ(既定 <repo>/.temp/uploads-pull)
 *   KA2_IMPORT_WIPE=1 取り込み前に既存の投稿・固定ページ・docs・添付・Flamingo を削除する
 *   KA2_IMPORT_DRY=1  書き込みせず件数のみ表示する
 *
 * 本文は旧サイトの REST が返していたレンダリング済み HTML(KA2_LEGACY_SNAPSHOT。既定 <repo>/.temp/legacy-snapshot)を使う。
 * 旧本文は Jetpack Markdown の原文なので、DB の post_content は使わない。
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit( 'Run with WP-CLI.' );
}

$root     = dirname( __DIR__ );
$repo     = dirname( $root );
$env      = static fn( string $k, string $d = '' ): string => ( false !== getenv( $k ) ) ? (string) getenv( $k ) : $d;
$dry      = '1' === $env( 'KA2_IMPORT_DRY' );
$prefix   = $env( 'KA2_LEGACY_PREFIX', 'ms_' );
$src_dir  = $env( 'KA2_LEGACY_UPLOADS', $repo . '/.temp/uploads-pull' );
$snap_dir = $env( 'KA2_LEGACY_SNAPSHOT', $repo . '/.temp/legacy-snapshot' );
$ids_file = $repo . '/frontend/scripts/migration-ids.json';

$legacy = new wpdb( $env( 'KA2_LEGACY_USER', 'root' ), $env( 'KA2_LEGACY_PASS' ), $env( 'KA2_LEGACY_DB', 'ka2_legacy' ), $env( 'KA2_LEGACY_HOST', 'localhost' ) );
$legacy->set_charset( $legacy->dbh, 'utf8mb4' );
$legacy->suppress_errors( false );
$tb = static fn( string $n ): string => $prefix . $n;

$ids          = json_decode( (string) file_get_contents( $ids_file ), true );
$migrate      = array_merge( $ids['post'], $ids['page'], $ids['docs'] );
$featured_ids = array_flip( $ids['featured'] );

wp_set_current_user( 1 ); // unfiltered_html を持たせ、kses による本文の加工を避ける

/* ---------- 本文(レンダリング済み HTML) ---------- */
$rendered = array();
foreach ( array( 'posts', 'pages', 'docs' ) as $f ) {
	foreach ( json_decode( (string) file_get_contents( "$snap_dir/$f.json" ), true ) as $row ) {
		$rendered[ (int) $row['id'] ] = $row['content']['rendered'] ?? '';
	}
}

$asset_re = '#https?://(?:i\d\.wp\.com/)?(?:www\.|stg\.|manage\.)?ka2\.org/(?:apps/)?(?:assets|wp-content)/(?:uploads/)?(\d{4}/[^\s"\'<>?]*)(?:\?[^\s"\'<>]*)?#';
// レンダリング済み HTML が再度 wpautop で整形されないよう、カスタム HTML ブロックで保持する
$to_new = static function ( string $html ) use ( $asset_re ): string {
	$html = trim( preg_replace( $asset_re, '/assets/uploads/$1', $html ) );
	return '' === $html ? '' : "<!-- wp:html -->\n" . $html . "\n<!-- /wp:html -->";
};

/* ---------- 取り込み対象の行 ---------- */
$in      = implode( ',', array_map( 'intval', $migrate ) );
$rows    = $legacy->get_results( "SELECT * FROM {$tb('posts')} WHERE ID IN ($in) AND post_status = 'publish'", ARRAY_A );
$missing = array_diff( $migrate, array_map( 'intval', array_column( $rows, 'ID' ) ) );
WP_CLI::log( sprintf( '対象 %d 件 / 旧 DB で公開状態の一致 %d 件 / 欠落 %d 件', count( $migrate ), count( $rows ), count( $missing ) ) );
if ( $missing ) {
	WP_CLI::warning( '欠落 ID: ' . implode( ',', $missing ) );
}
$contents = array();
foreach ( $rows as $r ) {
	$contents[ (int) $r['ID'] ] = $to_new( $rendered[ (int) $r['ID'] ] ?? '' );
}

/* ---------- 画像: 本文参照 + アイキャッチから必要な添付を決める ---------- */
$att_rows = $legacy->get_results( "SELECT * FROM {$tb('posts')} WHERE post_type = 'attachment'", ARRAY_A );
$att_meta = array();
foreach ( $legacy->get_results( "SELECT post_id, meta_key, meta_value FROM {$tb('postmeta')} WHERE meta_key IN ('_wp_attached_file','_wp_attachment_metadata','_wp_attachment_image_alt') AND post_id IN (SELECT ID FROM {$tb('posts')} WHERE post_type='attachment')", ARRAY_A ) as $m ) {
	$att_meta[ (int) $m['post_id'] ][ $m['meta_key'] ] = $m['meta_value'];
}
$variant_to_att = array(); // 相対パス(サイズ違い含む) => 添付 ID
foreach ( $att_rows as $a ) {
	$id   = (int) $a['ID'];
	$file = $att_meta[ $id ]['_wp_attached_file'] ?? '';
	if ( '' === $file ) {
		continue;
	}
	$variant_to_att[ $file ] = $id;
	$meta = maybe_unserialize( $att_meta[ $id ]['_wp_attachment_metadata'] ?? '' );
	$dir  = dirname( $file );
	foreach ( (array) ( $meta['sizes'] ?? array() ) as $s ) {
		$variant_to_att[ $dir . '/' . $s['file'] ] = $id;
	}
	if ( ! empty( $meta['original_image'] ) ) {
		$variant_to_att[ $dir . '/' . $meta['original_image'] ] = $id;
	}
}

$thumb = array();
foreach ( $legacy->get_results( "SELECT post_id, meta_value FROM {$tb('postmeta')} WHERE meta_key='_thumbnail_id' AND post_id IN ($in)", ARRAY_A ) as $m ) {
	$thumb[ (int) $m['post_id'] ] = (int) $m['meta_value'];
}

$need_att   = array();
$need_files = array();
$unmatched  = array();
foreach ( $contents as $pid => $html ) {
	if ( preg_match_all( '#/assets/(?:uploads/)?((?:\d{4}|files)/[^\s"\'<>)?]+)#', $html, $mm ) ) {
		foreach ( array_unique( $mm[1] ) as $rel ) {
			$rel = rawurldecode( $rel );
			if ( isset( $variant_to_att[ $rel ] ) ) {
				$need_att[ $variant_to_att[ $rel ] ] = true;
			} else {
				$unmatched[ $rel ] = $pid;
			}
			$need_files[ $rel ] = true;
		}
	}
}
foreach ( $thumb as $aid ) {
	$need_att[ $aid ] = true;
}
WP_CLI::log( sprintf( '必要な添付 %d 件 / 添付に紐づかない参照ファイル %d 件', count( $need_att ), count( $unmatched ) ) );
foreach ( $unmatched as $rel => $pid ) {
	WP_CLI::log( "  未登録の参照: $rel (post $pid)" );
}

if ( $dry ) {
	WP_CLI::success( 'dry run のため書き込みなし' );
	return;
}

/* ---------- 既存データの削除 ---------- */
if ( '1' === $env( 'KA2_IMPORT_WIPE' ) ) {
	$old = get_posts( array( 'post_type' => array( 'post', 'page', 'docs', 'attachment', 'flamingo_contact', 'flamingo_inbound' ), 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) );
	foreach ( $old as $oid ) {
		wp_delete_post( $oid, true );
	}
	WP_CLI::log( '既存 ' . count( $old ) . ' 件を削除' );
}

/* ---------- 添付ファイルの配置と登録 ---------- */
$up      = wp_upload_dir();
$basedir = $up['basedir'];
$copy    = static function ( string $rel ) use ( $src_dir, $basedir ): bool {
	$from = $src_dir . '/' . $rel;
	$to   = $basedir . '/' . $rel;
	if ( ! is_file( $from ) ) {
		return false;
	}
	wp_mkdir_p( dirname( $to ) );
	return copy( $from, $to );
};

$att_map = array();
$lost    = array();
global $wpdb;
foreach ( $att_rows as $a ) {
	$id = (int) $a['ID'];
	if ( empty( $need_att[ $id ] ) ) {
		continue;
	}
	$file = $att_meta[ $id ]['_wp_attached_file'] ?? '';
	$meta = maybe_unserialize( $att_meta[ $id ]['_wp_attachment_metadata'] ?? '' );
	$new  = wp_insert_attachment( wp_slash( array(
		'import_id'      => $id,
		'post_title'     => $a['post_title'],
		'post_name'      => $a['post_name'],
		'post_excerpt'   => $a['post_excerpt'],
		'post_content'   => $a['post_content'],
		'post_date'      => $a['post_date'],
		'post_date_gmt'  => $a['post_date_gmt'],
		'post_mime_type' => $a['post_mime_type'],
		'post_status'    => 'inherit',
		'post_author'    => 1,
		'guid'           => home_url( '/assets/uploads/' . $file ),
	) ), $file, 0, true );
	if ( is_wp_error( $new ) ) {
		WP_CLI::warning( "添付 $id: " . $new->get_error_message() );
		continue;
	}
	if ( is_array( $meta ) ) {
		wp_update_attachment_metadata( $new, $meta );
	}
	if ( ! empty( $att_meta[ $id ]['_wp_attachment_image_alt'] ) ) {
		update_post_meta( $new, '_wp_attachment_image_alt', wp_slash( $att_meta[ $id ]['_wp_attachment_image_alt'] ) );
	}
	$att_map[ $id ] = $new;
	$files          = array( $file );
	foreach ( (array) ( $meta['sizes'] ?? array() ) as $s ) {
		$files[] = dirname( $file ) . '/' . $s['file'];
	}
	if ( ! empty( $meta['original_image'] ) ) {
		$files[] = dirname( $file ) . '/' . $meta['original_image'];
	}
	foreach ( $files as $rel ) {
		if ( ! $copy( $rel ) ) {
			$lost[] = $rel;
		}
	}
}
foreach ( array_keys( $need_files ) as $rel ) {
	if ( ! is_file( $basedir . '/' . $rel ) && ! $copy( $rel ) ) {
		$lost[] = $rel;
	}
}
$lost = array_unique( $lost );
WP_CLI::log( sprintf( '添付 %d 件を登録 / 見つからないファイル %d 件', count( $att_map ), count( $lost ) ) );
foreach ( $lost as $l ) {
	WP_CLI::log( "  欠落ファイル: $l" );
}

/* ---------- タクソノミー ---------- */
$term_rows = $legacy->get_results(
	"SELECT tr.object_id, tt.taxonomy, t.term_id, t.name
	 FROM {$tb('term_relationships')} tr
	 JOIN {$tb('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
	 JOIN {$tb('terms')} t ON t.term_id = tt.term_id
	 WHERE tr.object_id IN ($in) AND tt.taxonomy IN ('category','post_tag')",
	ARRAY_A
);
$all_cats = $legacy->get_results(
	"SELECT t.term_id, t.name, t.slug, tt.parent, tt.description FROM {$tb('terms')} t JOIN {$tb('term_taxonomy')} tt ON tt.term_id = t.term_id WHERE tt.taxonomy = 'category'",
	OBJECT_K
);
$cat_new    = array(); // 旧 term_id => 新 term_id
$ensure_cat = function ( int $old ) use ( &$ensure_cat, &$cat_new, $all_cats ): int {
	if ( isset( $cat_new[ $old ] ) ) {
		return $cat_new[ $old ];
	}
	$c      = $all_cats[ $old ];
	$parent = (int) $c->parent ? $ensure_cat( (int) $c->parent ) : 0;
	$res    = term_exists( $c->slug, 'category' );
	if ( $res ) {
		$tid = (int) ( is_array( $res ) ? $res['term_id'] : $res );
		wp_update_term( $tid, 'category', array( 'name' => $c->name, 'parent' => $parent, 'description' => $c->description ) );
	} else {
		$ins = wp_insert_term( $c->name, 'category', array( 'slug' => $c->slug, 'parent' => $parent, 'description' => $c->description ) );
		if ( is_wp_error( $ins ) ) {
			WP_CLI::error( 'category ' . $c->slug . ': ' . $ins->get_error_message() );
		}
		$tid = (int) $ins['term_id'];
	}
	return $cat_new[ $old ] = $tid;
};

$post_terms = array();
foreach ( $term_rows as $r ) {
	$pid = (int) $r['object_id'];
	if ( 'category' === $r['taxonomy'] ) {
		$post_terms[ $pid ]['category'][] = $ensure_cat( (int) $r['term_id'] );
	} else {
		$post_terms[ $pid ]['post_tag'][] = wp_specialchars_decode( $r['name'] );
	}
}

/* ---------- 投稿・固定ページ・docs ---------- */
$flag_featured = $legacy->get_col( "SELECT post_id FROM {$tb('postmeta')} WHERE meta_key='featured' AND meta_value IN ('1','true') AND post_id IN ($in)" );
$post_ids      = array_flip( $migrate );
$done          = 0;
foreach ( $rows as $r ) {
	$id  = (int) $r['ID'];
	$arr = array(
		'import_id'      => $id,
		'post_type'      => $r['post_type'],
		'post_status'    => 'publish',
		'post_author'    => 1,
		'post_title'     => $r['post_title'],
		'post_name'      => $r['post_name'],
		'post_content'   => $contents[ $id ],
		'post_excerpt'   => $r['post_excerpt'],
		'post_date'      => $r['post_date'],
		'post_date_gmt'  => $r['post_date_gmt'],
		'menu_order'     => (int) $r['menu_order'],
		'post_parent'    => isset( $post_ids[ (int) $r['post_parent'] ] ) ? (int) $r['post_parent'] : 0,
		'comment_status' => 'closed',
		'ping_status'    => 'closed',
	);
	$new = wp_insert_post( wp_slash( $arr ), true );
	if ( is_wp_error( $new ) ) {
		WP_CLI::warning( "投稿 $id: " . $new->get_error_message() );
		continue;
	}
	$wpdb->update( $wpdb->posts, array( 'post_modified' => $r['post_modified'], 'post_modified_gmt' => $r['post_modified_gmt'] ), array( 'ID' => $new ) );
	foreach ( $post_terms[ $id ] ?? array() as $tax => $terms ) {
		wp_set_object_terms( $new, $terms, $tax );
	}
	if ( isset( $thumb[ $id ], $att_map[ $thumb[ $id ] ] ) ) {
		set_post_thumbnail( $new, $att_map[ $thumb[ $id ] ] );
	}
	if ( 'post' === $r['post_type'] && ( in_array( (string) $id, $flag_featured, true ) || isset( $featured_ids[ $id ] ) ) ) {
		update_post_meta( $new, 'featured', true );
	}
	++$done;
}
WP_CLI::log( "投稿/固定ページ/docs $done 件を登録" );

/* ---------- Flamingo(問い合わせデータ) ---------- */
$fl_posts = $legacy->get_results( "SELECT * FROM {$tb('posts')} WHERE post_type IN ('flamingo_contact','flamingo_inbound') AND post_status = 'publish'", ARRAY_A );
$fl_ids   = array_map( 'intval', array_column( $fl_posts, 'ID' ) );
$fl_in    = $fl_ids ? implode( ',', $fl_ids ) : '0';
$fl_meta  = $legacy->get_results( "SELECT post_id, meta_key, meta_value FROM {$tb('postmeta')} WHERE post_id IN ($fl_in)", ARRAY_A );
$fl_terms = $legacy->get_results(
	"SELECT tr.object_id, tt.taxonomy, t.name, t.slug FROM {$tb('term_relationships')} tr
	 JOIN {$tb('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
	 JOIN {$tb('terms')} t ON t.term_id = tt.term_id
	 WHERE tr.object_id IN ($fl_in) AND tt.taxonomy LIKE 'flamingo%'",
	ARRAY_A
);
$fl_count = 0;
foreach ( $fl_posts as $r ) {
	$id  = (int) $r['ID'];
	$new = wp_insert_post( wp_slash( array(
		'import_id'     => $id,
		'post_type'     => $r['post_type'],
		'post_status'   => 'publish',
		'post_author'   => 0,
		'post_title'    => $r['post_title'],
		'post_name'     => $r['post_name'],
		'post_content'  => $r['post_content'],
		'post_date'     => $r['post_date'],
		'post_date_gmt' => $r['post_date_gmt'],
	) ), true );
	if ( is_wp_error( $new ) ) {
		WP_CLI::warning( "flamingo $id: " . $new->get_error_message() );
		continue;
	}
	$wpdb->update( $wpdb->posts, array( 'post_modified' => $r['post_modified'], 'post_modified_gmt' => $r['post_modified_gmt'] ), array( 'ID' => $new ) );
	foreach ( $fl_meta as $m ) {
		if ( (int) $m['post_id'] === $id ) {
			add_post_meta( $new, $m['meta_key'], wp_slash( maybe_unserialize( $m['meta_value'] ) ) );
		}
	}
	foreach ( $fl_terms as $tr ) {
		if ( (int) $tr['object_id'] !== $id ) {
			continue;
		}
		if ( ! term_exists( $tr['slug'], $tr['taxonomy'] ) ) {
			wp_insert_term( $tr['name'], $tr['taxonomy'], array( 'slug' => $tr['slug'] ) );
		}
		wp_set_object_terms( $new, array( $tr['slug'] ), $tr['taxonomy'], true );
	}
	++$fl_count;
}
WP_CLI::log( "Flamingo $fl_count 件を登録" );

foreach ( array( 'category', 'post_tag' ) as $tax ) {
	wp_update_term_count_now( get_terms( array( 'taxonomy' => $tax, 'fields' => 'tt_ids', 'hide_empty' => false ) ), $tax );
}
flush_rewrite_rules();
WP_CLI::success( '取り込み完了' );

