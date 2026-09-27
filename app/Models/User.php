<?php
namespace App\Models;

use App\Core\Model;

class User extends Model {
    protected string $table = 'users';

    public function findByEmail(string $email): ?array {
        return $this->findBy('email', trim(strtolower($email)));
    }

    public function createPatientUser(string $name, string $email, string $password, ?string $phone = null): int {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $userId = (int)$this->create([
            'role' => 'patient',
            'name' => $name,
            'email' => strtolower($email),
            'password_hash' => $hash,
            'phone' => $phone,
            'avatar' => 'avatar-default.svg',
            'status' => 'active'
        ]);

        // Auto create associated empty patient record
        $patientModel = new Patient();
        $patientModel->create([
            'user_id' => $userId,
            'gender' => 'other'
        ]);

        return $userId;
    }

    public function getAllUsersWithDetails(string $role = '', string $keyword = ''): array {
        $sql = "SELECT u.id, u.role, u.name, u.email, u.phone, u.avatar, u.status, u.created_at,
                       p.dob, p.gender, p.address,
                       d.title as doctor_title, d.room_number,
                       r.staff_code
                FROM users u
                LEFT JOIN patients p ON u.id = p.user_id
                LEFT JOIN doctors d ON u.id = d.user_id
                LEFT JOIN receptionists r ON u.id = r.user_id
                WHERE 1=1";
        $params = [];

        if (!empty($role)) {
            $sql .= " AND u.role = :role";
            $params['role'] = $role;
        }

        if (!empty($keyword)) {
            $sql .= " AND (u.name LIKE :kw1 OR u.email LIKE :kw2 OR u.phone LIKE :kw3)";
            $params['kw1'] = "%{$keyword}%";
            $params['kw2'] = "%{$keyword}%";
            $params['kw3'] = "%{$keyword}%";
        }

        $sql .= " ORDER BY u.id DESC";
        return $this->rawQuery($sql, $params);
    }
}
