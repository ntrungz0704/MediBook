<?php
namespace App\Models;

use App\Core\Model;

class DoctorSchedule extends Model {
    protected string $table = 'doctor_schedules';

    public function getByDoctor(int $doctorId): array {
        return $this->where("doctor_id = :did", ['did' => $doctorId], "day_of_week ASC, start_time ASC");
    }

    public function getAllWithDoctors(): array {
        $sql = "SELECT ds.*, u.name as doctor_name, d.title as doctor_title, d.room_number
                FROM doctor_schedules ds
                JOIN doctors d ON ds.doctor_id = d.id
                JOIN users u ON d.user_id = u.id
                ORDER BY ds.day_of_week ASC, ds.start_time ASC";
        return $this->rawQuery($sql);
    }
}
