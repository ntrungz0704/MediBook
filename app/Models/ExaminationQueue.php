<?php
namespace App\Models;

use App\Core\Model;
use App\Core\Database;
use Exception;

class ExaminationQueue extends Model {
    protected string $table = 'examination_queues';

    /**
     * Check in an appointment at reception and assign a queue number
     */
    public function checkInAppointment(int $appointmentId, ?int $cashierUserId = null): array {
        $appModel = new Appointment();
        $app = $appModel->find($appointmentId);

        if (!$app) {
            return ['success' => false, 'error' => 'Không tìm thấy cuộc hẹn.'];
        }

        if (in_array($app['status'], ['checked_in', 'in_consultation', 'completed'])) {
            return ['success' => false, 'error' => 'Lịch hẹn này đã được tiếp đón hoặc đã khám.'];
        }

        if ($app['status'] === 'cancelled') {
            return ['success' => false, 'error' => 'Lịch hẹn đã bị hủy trước đó.'];
        }

        $doctorModel = new Doctor();
        $doctor = $doctorModel->find($app['doctor_id']);
        $room = $doctor['room_number'] ?? 'P.101';

        // Generate Queue Number (e.g. A-01, A-02 based on room prefix)
        $prefix = preg_replace('/[^0-9]/', '', $room);
        $letterPrefix = !empty($prefix) ? chr(64 + ((int)$prefix % 26 ?: 1)) : 'A';

        // Count how many patients checked in to this room today
        $today = date('Y-m-d');
        $db = Database::getConnection();
        $countStmt = $db->prepare(
            "SELECT COUNT(*) as total FROM examination_queues q
             JOIN appointments a ON q.appointment_id = a.id
             WHERE q.room = :room AND a.appointment_date = :adate"
        );
        $countStmt->execute(['room' => $room, 'adate' => $today]);
        $countRow = $countStmt->fetch();
        $nextNum = ((int)($countRow['total'] ?? 0)) + 1;
        $queueNumber = sprintf("%s-%02d", $letterPrefix, $nextNum);

        $db->beginTransaction();
        try {
            // Delete old queue entry if any
            $this->rawExecute("DELETE FROM examination_queues WHERE appointment_id = :aid", ['aid' => $appointmentId]);

            // Create queue record
            $queueId = $this->create([
                'appointment_id' => $appointmentId,
                'queue_number' => $queueNumber,
                'room' => $room,
                'status' => 'waiting',
                'estimated_time' => $app['start_time'],
                'checkin_time' => date('Y-m-d H:i:s')
            ]);

            // Update appointment status to 'checked_in'
            $appModel->changeStatus($appointmentId, 'checked_in', $cashierUserId, "Tiếp đón tại quầy - Cấp số thứ tự {$queueNumber} ({$room})");

            $db->commit();
            return ['success' => true, 'queue_id' => $queueId, 'queue_number' => $queueNumber, 'room' => $room];
        } catch (Exception $e) {
            $db->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Doctor calls next patient into consultation room
     */
    public function callPatient(int $queueId): bool {
        return $this->update($queueId, [
            'status' => 'calling',
            'call_time' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Doctor starts consultation
     */
    public function startConsultation(int $queueId, int $doctorId): bool {
        $queue = $this->find($queueId);
        if (!$queue) return false;

        $this->update($queueId, ['status' => 'in_room']);

        $appModel = new Appointment();
        return $appModel->changeStatus($queue['appointment_id'], 'in_consultation', null, 'Bác sĩ bắt đầu khám bệnh.');
    }

    /**
     * Get live queue board data for all rooms
     */
    public function getLiveBoardData(): array {
        $today = date('Y-m-d');
        $sql = "SELECT q.*, a.booking_code, a.appointment_date, a.start_time,
                       u_pat.name as patient_name,
                       u_doc.name as doctor_name, d.title as doctor_title
                FROM examination_queues q
                JOIN appointments a ON q.appointment_id = a.id
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                WHERE a.appointment_date = :today
                ORDER BY FIELD(q.status, 'calling', 'in_room', 'waiting', 'completed', 'skipped'), q.queue_number ASC";
        return $this->rawQuery($sql, ['today' => $today]);
    }

    /**
     * Get queue list for a specific doctor today
     */
    public function getDoctorTodayQueue(int $doctorId): array {
        $today = date('Y-m-d');
        $sql = "SELECT q.*, a.booking_code, a.appointment_date, a.start_time, a.symptoms,
                       u_pat.name as patient_name, u_pat.phone as patient_phone,
                       p.id as patient_id, p.dob as patient_dob, p.gender as patient_gender, p.medical_history,
                       s.name as specialty_name,
                       srv.name as service_name
                FROM examination_queues q
                JOIN appointments a ON q.appointment_id = a.id
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN services srv ON a.service_id = srv.id
                WHERE a.doctor_id = :did AND a.appointment_date = :today
                ORDER BY FIELD(q.status, 'calling', 'in_room', 'waiting', 'completed', 'skipped'), q.queue_number ASC";
        return $this->rawQuery($sql, ['did' => $doctorId, 'today' => $today]);
    }
}
