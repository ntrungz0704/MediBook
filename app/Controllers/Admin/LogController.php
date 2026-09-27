<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\ActivityLog;

class LogController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $logModel = new ActivityLog();
        $logs = $logModel->getRecentLogs(100);

        $this->view('admin/logs/index', [
            'pageTitle' => 'Nhật ký hoạt động bảo mật & kiểm toán',
            'logs' => $logs
        ], 'layouts/admin');
    }
}
