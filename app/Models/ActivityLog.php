<?php
namespace App\Models;

use App\Core\Model;

class ActivityLog extends Model {
    protected string $table = 'activity_logs';

    public function getRecentLogs(int $limit = 50): array {
        $sql = "SELECT al.*, u.name as user_name, u.role as user_role, u.email as user_email
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.id DESC LIMIT " . (int)$limit;
        return $this->rawQuery($sql);
    }
}
