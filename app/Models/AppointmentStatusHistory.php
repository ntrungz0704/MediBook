<?php
namespace App\Models;

use App\Core\Model;

class AppointmentStatusHistory extends Model {
    protected string $table = 'appointment_status_history';

    public function getByAppointment(int $appointmentId): array {
        $sql = "SELECT ash.*, u.name as changed_by_name, u.role as changed_by_role
                FROM appointment_status_history ash
                LEFT JOIN users u ON ash.changed_by_user_id = u.id
                WHERE ash.appointment_id = :aid
                ORDER BY ash.created_at ASC";
        return $this->rawQuery($sql, ['aid' => $appointmentId]);
    }
}
