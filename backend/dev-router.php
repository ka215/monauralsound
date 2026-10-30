<?php
// ローカル開発専用: php -S 用ルーター(本番は .htaccess)。
$root = realpath( __DIR__ . '/public' );
$path = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
$file = realpath( $root . $path );

if ( $file && str_starts_with( $file, $root ) ) {
	if ( is_dir( $file ) && is_file( $file . '/index.php' ) ) {
		$_SERVER['SCRIPT_NAME'] = rtrim( $path, '/' ) . '/index.php';
		chdir( $file );
		require $file . '/index.php';
		return true;
	}
	if ( is_file( $file ) ) {
		return false;
	}
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
chdir( $root );
require $root . '/index.php';
