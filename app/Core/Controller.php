<?php
namespace App\Core;

use App\Models\ActivityLog;

abstract class Controller {
    protected Request $request;

    public function __construct() {
        $this->request = new Request();
    }

    /**
     * Render a view template
     */
    protected function view(string $viewPath, array $data = [], ?string $layout = 'layouts/main'): void {
        View::render($viewPath, $data, $layout);
    }

    /**
     * Return JSON response
     */
    protected function json(array $data, int $status = 200): void {
        Response::json($data, $status);
    }

    /**
     * Redirect to another URL
     */
    protected function redirect(string $url, int $statusCode = 302): void {
        Response::redirect($url, $statusCode);
    }

    /**
     * Validate incoming request data
     */
    protected function validate(array $rules): Validator {
        $data = $this->request->all();
        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            Session::set('_old_input', $data);
            $firstError = reset($validator->errors())[0] ?? 'Dữ liệu không hợp lệ.';
            Session::flash('error', $firstError);
        }

        return $validator;
    }

    /**
     * Verify CSRF token for POST requests
     */
    protected function validateCsrf(): void {
        if ($this->request->isPost()) {
            $token = $this->request->input('_token');
            if (!$token && isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
                $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
            }

            if (!Csrf::validate($token)) {
                if ($this->request->isAjax()) {
                    $this->json(['success' => false, 'message' => 'Phiên làm việc đã hết hạn hoặc mã CSRF không hợp lệ.'], 403);
                } else {
                    Session::flash('error', 'Mã xác thực bảo mật (CSRF) không hợp lệ hoặc đã hết hạn.');
                    $this->redirect($_SERVER['HTTP_REFERER'] ?? '/');
                }
                exit;
            }
        }
    }

    /**
     * Log user activity
     */
    protected function logActivity(string $action, ?string $entityType = null, ?int $entityId = null, ?string $details = null): void {
        try {
            $logModel = new ActivityLog();
            $logModel->create([
                'user_id' => Auth::id(),
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255),
                'details' => $details
            ]);
        } catch (\Exception $e) {
            // Silently ignore logging errors
        }
    }
}
