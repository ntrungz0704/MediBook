<?php
namespace App\Core;

class Csrf {
    /**
     * Generate or get current CSRF token
     */
    public static function token(): string {
        Session::start();
        $token = Session::get('_csrf_token');
        if (!$token) {
            $token = bin2hex(random_bytes(32));
            Session::set('_csrf_token', $token);
        }
        return $token;
    }

    /**
     * Return hidden input field with CSRF token
     */
    public static function field(): string {
        $token = self::token();
        return '<input type="hidden" name="_token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">';
    }

    /**
     * Validate submitted CSRF token
     */
    public static function validate(?string $token): bool {
        Session::start();
        $sessionToken = Session::get('_csrf_token');
        if (empty($token) || empty($sessionToken)) {
            return false;
        }
        return hash_equals($sessionToken, $token);
    }

    /**
     * Alias for validate
     */
    public static function verify(?string $token): bool {
        return self::validate($token);
    }

    /**
     * Regenerate CSRF token
     */
    public static function regenerate(): string {
        Session::start();
        $token = bin2hex(random_bytes(32));
        Session::set('_csrf_token', $token);
        return $token;
    }
}
