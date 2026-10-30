<?php
/**
 * Plugin Name: KA2 Contact API
 * Description: POST /wp-json/ka2/v1/contact。検証 → Turnstile → レート制限 → Flamingo 保存 → 通知メール。
 */

defined( 'ABSPATH' ) || exit;

const KA2_CONTACT_RATE_LIMIT  = 5;   // 回
const KA2_CONTACT_RATE_WINDOW = 600; // 秒

function ka2_allowed_origins(): array {
	$raw = defined( 'KA2_ALLOWED_ORIGINS' ) ? KA2_ALLOWED_ORIGINS : 'https://ka2.org';
	return array_filter( array_map( 'trim', explode( ',', $raw ) ) );
}

// CORS は許可オリジンのみ。WP 既定(全オリジン反映)は置き換える
add_filter( 'rest_pre_serve_request', static function ( $served, $result, WP_REST_Request $request ) {
	if ( ! str_starts_with( $request->get_route(), '/ka2/v1/' ) ) {
		return $served;
	}
	remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
	$origin = get_http_origin();
	if ( $origin && in_array( $origin, ka2_allowed_origins(), true ) ) {
		header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
		header( 'Access-Control-Allow-Methods: POST, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type' );
		header( 'Access-Control-Max-Age: 600' );
		header( 'Vary: Origin', false );
	}
	return $served;
}, 5, 3 );

add_action( 'rest_api_init', static function () {
	// 既定の CORS フィルタは rest_api_init 内で登録されるため、ここで先に外す必要はなく上のフィルタで置換する
	register_rest_route( 'ka2/v1', '/contact', array(
		'methods'             => WP_REST_Server::CREATABLE,
		'callback'            => 'ka2_contact_handle',
		'permission_callback' => '__return_true',
		'args'                => array(
			'name'            => array( 'type' => 'string', 'required' => true ),
			'email'           => array( 'type' => 'string', 'required' => true ),
			'subject'         => array( 'type' => 'string', 'required' => true ),
			'message'         => array( 'type' => 'string', 'required' => true ),
			'turnstile_token' => array( 'type' => 'string', 'required' => true ),
			'website'         => array( 'type' => 'string', 'required' => false ), // ハニーポット
		),
	) );
} );

function ka2_contact_error( string $code, string $message, int $status ): WP_Error {
	return new WP_Error( $code, $message, array( 'status' => $status ) );
}

function ka2_client_ip(): string {
	return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
}

function ka2_verify_turnstile( string $token, string $ip ): bool {
	$secret = defined( 'KA2_TURNSTILE_SECRET' ) ? KA2_TURNSTILE_SECRET : '';
	if ( '' === $secret || '' === $token ) {
		return false;
	}
	$res = wp_remote_post( 'https://challenges.cloudflare.com/turnstile/v0/siteverify', array(
		'timeout' => 10,
		'body'    => array( 'secret' => $secret, 'response' => $token, 'remoteip' => $ip ),
	) );
	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		return false;
	}
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	return is_array( $body ) && ! empty( $body['success'] );
}

// 同一 IP の送信回数を一定時間内で制限する(戻り値: 許可されたか)
function ka2_rate_limit_ok( string $ip ): bool {
	$key   = 'ka2_contact_' . md5( $ip );
	$count = (int) get_transient( $key );
	if ( $count >= KA2_CONTACT_RATE_LIMIT ) {
		return false;
	}
	set_transient( $key, $count + 1, KA2_CONTACT_RATE_WINDOW );
	return true;
}

function ka2_contact_handle( WP_REST_Request $request ) {
	$name    = trim( sanitize_text_field( (string) $request['name'] ) );
	$email   = sanitize_email( (string) $request['email'] );
	$subject = trim( sanitize_text_field( (string) $request['subject'] ) );
	$message = trim( sanitize_textarea_field( (string) $request['message'] ) );

	$errors = array();
	if ( '' === $name || mb_strlen( $name ) > 100 ) {
		$errors['name'] = 'お名前を100文字以内で入力してください。';
	}
	if ( ! is_email( $email ) ) {
		$errors['email'] = 'メールアドレスの形式が正しくありません。';
	}
	if ( '' === $subject || mb_strlen( $subject ) > 200 ) {
		$errors['subject'] = '件名を200文字以内で入力してください。';
	}
	if ( '' === $message || mb_strlen( $message ) > 5000 ) {
		$errors['message'] = '内容を5000文字以内で入力してください。';
	}
	if ( $errors ) {
		return new WP_Error( 'invalid_input', '入力内容を確認してください。', array( 'status' => 422, 'fields' => $errors ) );
	}

	// ハニーポットが埋まっていれば、ボットに悟られないよう成功を装って破棄する
	if ( '' !== trim( (string) $request['website'] ) ) {
		return rest_ensure_response( array( 'ok' => true ) );
	}

	$origin = get_http_origin();
	if ( $origin && ! in_array( $origin, ka2_allowed_origins(), true ) ) {
		return ka2_contact_error( 'forbidden_origin', '許可されていない送信元です。', 403 );
	}

	$ip = ka2_client_ip();
	if ( ! ka2_rate_limit_ok( $ip ) ) {
		return ka2_contact_error( 'rate_limited', '送信回数が多すぎます。しばらくしてからお試しください。', 429 );
	}
	if ( ! ka2_verify_turnstile( (string) $request['turnstile_token'], $ip ) ) {
		return ka2_contact_error( 'spam_rejected', '確認に失敗しました。ページを再読み込みしてもう一度お試しください。', 403 );
	}

	if ( ! class_exists( 'Flamingo_Inbound_Message' ) ) {
		return ka2_contact_error( 'save_failed', '送信内容を保存できませんでした。時間をおいてお試しください。', 500 );
	}
	$saved = Flamingo_Inbound_Message::add( array(
		'channel'    => 'contact',
		'subject'    => $subject,
		'from'       => sprintf( '%s <%s>', $name, $email ),
		'from_name'  => $name,
		'from_email' => $email,
		'fields'     => array( 'your-name' => $name, 'your-email' => $email, 'your-subject' => $subject, 'your-message' => $message ),
		'meta'       => array(
			'remote_ip'  => $ip,
			'user_agent' => isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '',
			'timestamp'  => time(),
			'url'        => get_http_origin() ?: '',
		),
	) );
	// id は private で __get 経由のため empty() は使えない
	if ( ! $saved || ! $saved->id ) {
		return ka2_contact_error( 'save_failed', '送信内容を保存できませんでした。時間をおいてお試しください。', 500 );
	}

	// 通知の失敗は保存済みのため成功扱いとし、ログにだけ残す
	$to   = defined( 'KA2_CONTACT_TO' ) ? KA2_CONTACT_TO : get_option( 'admin_email' );
	$body = "お名前: {$name}\nメール: {$email}\n件名: {$subject}\n\n{$message}\n\n--\nIP: {$ip}\n管理画面: " . admin_url( 'admin.php?page=flamingo_inbound' );
	$sent = wp_mail(
		$to,
		'[お問い合わせ] ' . str_replace( array( "\r", "\n" ), ' ', $subject ),
		$body,
		array( 'Reply-To: ' . $name . ' <' . $email . '>' )
	);
	if ( ! $sent ) {
		error_log( '[ka2-contact] notification mail failed for inbound #' . $saved->id );
	}

	return rest_ensure_response( array( 'ok' => true ) );
}
