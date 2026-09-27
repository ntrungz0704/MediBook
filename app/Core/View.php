<?php
namespace App\Core;

use Exception;

class View {
    /**
     * Render a view within a layout
     */
    public static function render(string $viewPath, array $data = [], ?string $layout = 'layouts/main'): void {
        $viewFile = APP_PATH . '/Views/' . str_replace('.', '/', $viewPath) . '.php';

        if (!file_exists($viewFile)) {
            throw new Exception("Không tìm thấy view: {$viewPath} ({$viewFile})");
        }

        // Global variables available in all views
        $currentUser = Auth::user();
        $isLoggedIn = Auth::check();
        $userRole = Auth::role();
        $csrfToken = Csrf::token();
        $csrfField = Csrf::field();
        $flashSuccess = Session::flash('success');
        $flashError = Session::flash('error');
        $flashInfo = Session::flash('info');

        // Extract passed data
        extract($data, EXTR_SKIP);

        // Capture inner view content
        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        // Render within layout if specified
        if ($layout !== null) {
            $layoutFile = APP_PATH . '/Views/' . str_replace('.', '/', $layout) . '.php';
            if (!file_exists($layoutFile)) {
                throw new Exception("Không tìm thấy layout: {$layout} ({$layoutFile})");
            }
            require $layoutFile;
        } else {
            echo $content;
        }
    }
}
