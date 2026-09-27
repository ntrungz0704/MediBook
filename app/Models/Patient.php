<?php
namespace App\Models;

use App\Core\Model;

class Patient extends Model {
    protected string $table = 'patients';

    public function getByUserId(int $userId): ?array {
        $sql = "SELECT p.*, u.name, u.email, u.phone, u.avatar, u.status
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.user_id = :uid LIMIT 1";
        $res = $this->rawQuery($sql, ['uid' => $userId]);
        return $res[0] ?? null;
    }

    public function getProfile(int $patientId): ?array {
        $sql = "SELECT p.*, u.name, u.email, u.phone, u.avatar, u.status
                FROM patients p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = :pid LIMIT 1";
        $res = $this->rawQuery($sql, ['pid' => $patientId]);
        return $res[0] ?? null;
    }
}
