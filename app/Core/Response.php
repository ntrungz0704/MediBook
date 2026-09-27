<?php
namespace App\Core;

class Response {
    public static function status(int $code): void {
        http_response_code($code);
    }

    public static function json(array $data, int $status = 200): void {
        self::status($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function redirect(string $url, int $statusCode = 302): void {
        self::status($statusCode);
        header("Location: {$url}");
        exit;
    }

    public static function error(int $code, string $message = ''): void {
        self::status($code);
        $title = $code === 404 ? '404 - Trang không tồn tại' : ($code === 403 ? '403 - Truy cập bị từ chối' : 'Lỗi hệ thống');
        $desc = $message ?: ($code === 404 ? 'Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.' : 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu.');

        View::render('errors/error', [
            'code' => $code,
            'title' => $title,
            'message' => $desc
        ], 'layouts/main');
        exit;
    }
}
