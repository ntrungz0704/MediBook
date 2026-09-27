<?php
namespace App\Core;

use Exception;

class Router {
    private array $routes = [];

    public function get(string $uri, $handler, array $middlewares = []): void {
        $this->addRoute('GET', $uri, $handler, $middlewares);
    }

    public function post(string $uri, $handler, array $middlewares = []): void {
        $this->addRoute('POST', $uri, $handler, $middlewares);
    }

    private function addRoute(string $method, string $uri, $handler, array $middlewares): void {
        $uri = '/' . trim($uri, '/');
        if ($uri !== '/' && str_ends_with($uri, '/')) {
            $uri = rtrim($uri, '/');
        }

        // Convert route pattern with parameters {param} into regex
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $uri);
        $pattern = '#^' . $pattern . '$#';

        $this->routes[] = [
            'method' => $method,
            'uri' => $uri,
            'pattern' => $pattern,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    /**
     * Dispatch the current HTTP request to matching route
     */
    public function dispatch(): void {
        $requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // Normalize URI
        $requestUri = '/' . trim($requestUri, '/');
        if ($requestUri !== '/' && str_ends_with($requestUri, '/')) {
            $requestUri = rtrim($requestUri, '/');
        }

        foreach ($this->routes as $route) {
            if ($route['method'] === $requestMethod && preg_match($route['pattern'], $requestUri, $matches)) {
                // Execute middlewares
                $this->executeMiddlewares($route['middlewares']);

                // Filter named parameters from regex matches
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                $handler = $route['handler'];
                if (is_callable($handler)) {
                    call_user_func_array($handler, array_values($params));
                    return;
                }

                if (is_array($handler)) {
                    [$controllerClass, $method] = $handler;

                    if (!class_exists($controllerClass)) {
                        throw new Exception("Không tìm thấy Controller: {$controllerClass}");
                    }

                    $controller = new $controllerClass();
                    if (!method_exists($controller, $method)) {
                        throw new Exception("Phương thức {$method} không tồn tại trong {$controllerClass}");
                    }

                    call_user_func_array([$controller, $method], array_values($params));
                    return;
                }
            }
        }

        // No route matched: 404
        Response::error(404, 'Không tìm thấy trang yêu cầu: ' . htmlspecialchars($requestUri));
    }

    /**
     * Execute route middlewares
     */
    private function executeMiddlewares(array $middlewares): void {
        foreach ($middlewares as $middleware) {
            if ($middleware === 'auth') {
                Auth::requireLogin();
            } elseif (str_starts_with($middleware, 'role:')) {
                $rolesStr = substr($middleware, 5);
                $allowedRoles = explode(',', $rolesStr);
                Auth::requireRole($allowedRoles);
            }
        }
    }
}
