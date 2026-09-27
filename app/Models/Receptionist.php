<?php
namespace App\Models;

use App\Core\Model;

class Receptionist extends Model {
    protected string $table = 'receptionists';

    public function getByUserId(int $userId): ?array {
        $sql = "SELECT r.*, u.name, u.email, u.phone, u.avatar
                FROM receptionists r
                JOIN users u ON r.user_id = u.id
                WHERE r.user_id = :uid LIMIT 1";
        $res = $this->rawQuery($sql, ['uid' => $userId]);
        return $res[0] ?? null;
    }
}
