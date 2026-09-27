<?php
namespace App\Core;

use App\Models\User;

class Auth {
    /**
     * Check credentials and authenticate user
     */
    public static function attempt(string $email, string $password): bool {
        $userModel = new User();
        $user = $userModel->findBy('email', trim(strtolower($email)));

        if (!$user) {
            return false;
        }

        if ($user['status'] !== 'active') {
            return false;
        }

        if (password_verify($password, $user['password_hash'])) {
            self::login($user);
            return true;
        }

        return false;
    }

    /**
     * Set user session on login
     */
    public static function login(array $user): void {
        Session::start();
        // Prevent session fixation
        if (!headers_sent()) {
            session_regenerate_id(true);
        }

        // Store safe user data in session
        Session::set('user_id', (int)$user['id']);
        Session::set('user_name', $user['name']);
        Session::set('user_email', $user['email']);
        Session::set('user_role', $user['role']);
        Session::set('user_avatar', $user['avatar'] ?? 'avatar-default.svg');
    }

    /**
     * Terminate user session
     */
    public static function logout(): void {
        Session::destroy();
    }

    /**
     * Check if user is logged in
     */
    public static function check(): bool {
        return Session::has('user_id');
    }

    /**
     * Get current logged-in user basic info
     */
    public static function user(): ?array {
        if (!self::check()) {
            return null;
        }

        return [
            'id' => (int)Session::get('user_id'),
            'name' => Session::get('user_name'),
            'email' => Session::get('user_email'),
            'role' => Session::get('user_role'),
            'avatar' => Session::get('user_avatar')
        ];
    }

    public static function id(): ?int {
        return (int)Session::get('user_id') ?: null;
    }

    public static function role(): ?string {
        return Session::get('user_role');
    }

    public static function hasRole($roles): bool {
        if (!self::check()) {
            return false;
        }

        $userRole = self::role();
        if (is_array($roles)) {
            return in_array($userRole, $roles, true);
        }

        return $userRole === $roles;
    }

    public static function requireLogin(string $redirect = '/login'): void {
        if (!self::check()) {
            Session::flash('error', 'Vui lòng đăng nhập để tiếp tục.');
            Session::set('intended_url', $_SERVER['REQUEST_URI'] ?? '/');
            Response::redirect($redirect);
            exit;
        }
    }

    public static function requireRole($roles, string $redirect = '/'): void {
        self::requireLogin();

        if (!self::hasRole($roles)) {
            Session::flash('error', 'Bạn không có quyền truy cập trang này.');
            Response::redirect($redirect);
            exit;
        }
    }
}
