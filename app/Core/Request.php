<?php
namespace App\Core;

class Request {
    public function method(): string {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function isPost(): bool {
        return $this->method() === 'POST';
    }

    public function isGet(): bool {
        return $this->method() === 'GET';
    }

    public function isAjax(): bool {
        return (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
            || (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false);
    }

    public function uri(): string {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        // Normalize trailing slashes except for root
        if ($uri !== '/' && str_ends_with($uri, '/')) {
            $uri = rtrim($uri, '/');
        }
        return $uri;
    }

    public function input(string $key, $default = null) {
        $val = $_POST[$key] ?? $_GET[$key] ?? null;
        if ($val === null) {
            $json = $this->json();
            if ($json !== null && isset($json[$key])) {
                $val = $json[$key];
            }
        }

        if ($val === null) {
            return $default;
        }

        return is_string($val) ? trim($val) : $val;
    }

    public function all(): array {
        $data = array_merge($_GET, $_POST);
        $json = $this->json();
        if ($json) {
            $data = array_merge($data, $json);
        }
        return $data;
    }

    public function only(array $keys): array {
        $all = $this->all();
        $result = [];
        foreach ($keys as $k) {
            if (array_key_exists($k, $all)) {
                $result[$k] = is_string($all[$k]) ? trim($all[$k]) : $all[$k];
            }
        }
        return $result;
    }

    public function json(): ?array {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : null;
        }
        return null;
    }

    public function file(string $key): ?array {
        return $_FILES[$key] ?? null;
    }
}
