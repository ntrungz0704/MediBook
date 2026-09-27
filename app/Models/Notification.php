<?php
namespace App\Models;

use App\Core\Model;

class Notification extends Model {
    protected string $table = 'notifications';

    public function getUserNotifications(int $userId, int $limit = 20): array {
        return $this->where("user_id = :uid", ['uid' => $userId], "id DESC", $limit);
    }

    public function getUnreadCount(int $userId): int {
        return $this->count("user_id = :uid AND is_read = 0", ['uid' => $userId]);
    }

    public function markAsRead(int $notificationId, int $userId): bool {
        return $this->rawExecute(
            "UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid",
            ['id' => $notificationId, 'uid' => $userId]
        );
    }

    public function markAllAsRead(int $userId): bool {
        return $this->rawExecute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = :uid",
            ['uid' => $userId]
        );
    }
}
