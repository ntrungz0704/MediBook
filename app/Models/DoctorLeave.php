<?php
namespace App\Models;

use App\Core\Model;

class DoctorLeave extends Model {
    protected string $table = 'doctor_leaves';

    public function isDoctorOnLeave(int $doctorId, string $date): bool {
        $count = $this->count("doctor_id = :did AND leave_date = :ldate AND status = 'approved'", [
            'did' => $doctorId,
            'ldate' => $date
        ]);
        return $count > 0;
    }

    public function getDoctorLeaves(int $doctorId): array {
        return $this->where("doctor_id = :did", ['did' => $doctorId], "leave_date DESC");
    }

    public function getAllWithDoctors(): array {
        $sql = "SELECT dl.*, u.name as doctor_name, d.title as doctor_title
                FROM doctor_leaves dl
                JOIN doctors d ON dl.doctor_id = d.id
                JOIN users u ON d.user_id = u.id
                ORDER BY dl.leave_date DESC";
        return $this->rawQuery($sql);
    }
}
