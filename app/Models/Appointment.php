<?php
namespace App\Models;

use App\Core\Model;
use App\Core\Database;
use App\Core\Helper;
use Exception;

class Appointment extends Model {
    protected string $table = 'appointments';

    /**
     * Create an appointment securely with Transaction and race-condition checks
     */
    public function createAppointmentWithTransaction(array $data): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $doctorId = (int)$data['doctor_id'];
            $patientId = (int)$data['patient_id'];
            $specialtyId = (int)$data['specialty_id'];
            $serviceId = !empty($data['service_id']) ? (int)$data['service_id'] : null;
            $date = $data['appointment_date'];
            $startTime = $data['start_time'];
            $endTime = $data['end_time'];
            $symptoms = $data['symptoms'] ?? '';

            // 1. Conflict Check: Doctor leave
            $leaveModel = new DoctorLeave();
            if ($leaveModel->isDoctorOnLeave($doctorId, $date)) {
                throw new Exception("Bác sĩ có lịch nghỉ phép vào ngày đã chọn.");
            }

            // 2. Conflict Check: Doctor Schedule
            $dow = (int)date('w', strtotime($date));
            $scheduleModel = new DoctorSchedule();
            $schedule = $scheduleModel->first("doctor_id = :did AND day_of_week = :dow AND status = 'active'", [
                'did' => $doctorId,
                'dow' => $dow
            ]);
            if (!$schedule) {
                throw new Exception("Bác sĩ không có lịch làm việc vào ngày này.");
            }

            // 3. Conflict Check: Overlapping appointment for doctor
            $overlapSql = "SELECT id FROM appointments 
                           WHERE doctor_id = :did AND appointment_date = :adate 
                           AND status NOT IN ('cancelled', 'no_show')
                           AND (
                               (start_time < :end_time AND end_time > :start_time)
                           ) FOR UPDATE";
            $stmt = $db->prepare($overlapSql);
            $stmt->execute([
                'did' => $doctorId,
                'adate' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime
            ]);

            if ($stmt->fetch()) {
                throw new Exception("Khung giờ này vừa có người đặt hoặc trùng với lịch khám khác. Vui lòng chọn khung giờ khác.");
            }

            // 4. Generate unique Booking Code
            do {
                $code = Helper::generateBookingCode();
                $existing = $this->first("booking_code = :code", ['code' => $code]);
            } while ($existing);

            // 5. Insert Appointment
            $insertSql = "INSERT INTO appointments 
                          (booking_code, patient_id, doctor_id, specialty_id, service_id, appointment_date, start_time, end_time, status, symptoms) 
                          VALUES 
                          (:code, :pid, :did, :sid, :srvid, :adate, :stime, :etime, 'confirmed', :symp)";
            $stmtInsert = $db->prepare($insertSql);
            $stmtInsert->execute([
                'code' => $code,
                'pid' => $patientId,
                'did' => $doctorId,
                'sid' => $specialtyId,
                'srvid' => $serviceId,
                'adate' => $date,
                'stime' => $startTime,
                'etime' => $endTime,
                'symp' => $symptoms
            ]);
            $appointmentId = (int)$db->lastInsertId();

            // 6. Record Initial Status History
            $historySql = "INSERT INTO appointment_status_history (appointment_id, old_status, new_status, note) 
                           VALUES (:aid, NULL, 'confirmed', 'Đặt lịch thành công qua hệ thống trực tuyến')";
            $stmtHistory = $db->prepare($historySql);
            $stmtHistory->execute(['aid' => $appointmentId]);

            // 7. Send Notifications
            $patient = (new Patient())->find($patientId);
            if ($patient) {
                $notifSql = "INSERT INTO notifications (user_id, title, message, type, link) 
                             VALUES (:uid, :title, :msg, 'appointment', :link)";
                $stmtNotif = $db->prepare($notifSql);
                $stmtNotif->execute([
                    'uid' => $patient['user_id'],
                    'title' => 'Đặt lịch khám thành công',
                    'msg' => "Lịch khám mã {$code} vào ngày " . Helper::formatDate($date) . " ({$startTime}) đã được xác nhận.",
                    'link' => "/appointments/{$code}"
                ]);
            }

            $doctor = (new Doctor())->find($doctorId);
            if ($doctor) {
                $stmtNotifDoc = $db->prepare("INSERT INTO notifications (user_id, title, message, type, link) VALUES (:uid, :title, :msg, 'doctor_appointment', :link)");
                $stmtNotifDoc->execute([
                    'uid' => $doctor['user_id'],
                    'title' => 'Lịch hẹn khám mới',
                    'msg' => "Có bệnh nhân đặt lịch hẹn khám vào ngày " . Helper::formatDate($date) . " lúc {$startTime}.",
                    'link' => "/doctor/queue"
                ]);
            }

            $db->commit();
            return ['success' => true, 'booking_code' => $code, 'appointment_id' => $appointmentId];
        } catch (Exception $e) {
            $db->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Change Appointment Status with History Record
     */
    public function changeStatus(int $appointmentId, string $newStatus, ?int $changedByUserId = null, string $note = ''): bool {
        $app = $this->find($appointmentId);
        if (!$app) return false;

        $oldStatus = $app['status'];
        $this->update($appointmentId, ['status' => $newStatus]);

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_user_id, note) 
                              VALUES (:aid, :old_s, :new_s, :uid, :note)");
        return $stmt->execute([
            'aid' => $appointmentId,
            'old_s' => $oldStatus,
            'new_s' => $newStatus,
            'uid' => $changedByUserId,
            'note' => $note
        ]);
    }

    /**
     * Get Detailed Appointment Information by Booking Code
     */
    public function getDetailsByCode(string $bookingCode): ?array {
        $sql = "SELECT a.*,
                       u_pat.name as patient_name, u_pat.email as patient_email, u_pat.phone as patient_phone,
                       p.dob as patient_dob, p.gender as patient_gender, p.address as patient_address, p.health_insurance_no,
                       u_doc.name as doctor_name, u_doc.phone as doctor_phone,
                       d.title as doctor_title, d.room_number, d.consultation_fee,
                       s.name as specialty_name,
                       srv.name as service_name, srv.price as service_price,
                       q.queue_number, q.status as queue_status, q.room as queue_room,
                       pay.id as payment_id, pay.invoice_code, pay.final_amount, pay.payment_status, pay.payment_method,
                       mr.id as medical_record_id, mr.clinical_diagnosis, mr.icd10_code, mr.doctor_notes,
                       pr.id as prescription_id
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN services srv ON a.service_id = srv.id
                LEFT JOIN examination_queues q ON a.id = q.appointment_id
                LEFT JOIN payments pay ON a.id = pay.appointment_id
                LEFT JOIN medical_records mr ON a.id = mr.appointment_id
                LEFT JOIN prescriptions pr ON mr.id = pr.medical_record_id
                WHERE a.booking_code = :code LIMIT 1";
        $res = $this->rawQuery($sql, ['code' => $bookingCode]);
        return $res[0] ?? null;
    }

    /**
     * Get Detailed Appointment by ID
     */
    public function getDetailsById(int $appointmentId): ?array {
        $sql = "SELECT a.*,
                       u_pat.name as patient_name, u_pat.email as patient_email, u_pat.phone as patient_phone,
                       p.dob as patient_dob, p.gender as patient_gender, p.address as patient_address, p.health_insurance_no,
                       u_doc.name as doctor_name, u_doc.phone as doctor_phone,
                       d.title as doctor_title, d.room_number, d.consultation_fee,
                       s.name as specialty_name,
                       srv.name as service_name, srv.price as service_price,
                       q.queue_number, q.status as queue_status, q.room as queue_room,
                       pay.id as payment_id, pay.invoice_code, pay.final_amount, pay.payment_status, pay.payment_method,
                       mr.id as medical_record_id, mr.clinical_diagnosis, mr.icd10_code, mr.doctor_notes,
                       pr.id as prescription_id
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN services srv ON a.service_id = srv.id
                LEFT JOIN examination_queues q ON a.id = q.appointment_id
                LEFT JOIN payments pay ON a.id = pay.appointment_id
                LEFT JOIN medical_records mr ON a.id = mr.appointment_id
                LEFT JOIN prescriptions pr ON mr.id = pr.medical_record_id
                WHERE a.id = :id LIMIT 1";
        $res = $this->rawQuery($sql, ['id' => $appointmentId]);
        return $res[0] ?? null;
    }

    /**
     * Get Patient's Appointments
     */
    public function getPatientAppointments(int $patientId): array {
        $sql = "SELECT a.*,
                       u_doc.name as doctor_name, d.title as doctor_title, d.room_number,
                       s.name as specialty_name,
                       srv.name as service_name,
                       q.queue_number,
                       rev.rating as user_rating,
                       pay.payment_status
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN services srv ON a.service_id = srv.id
                LEFT JOIN examination_queues q ON a.id = q.appointment_id
                LEFT JOIN reviews rev ON a.id = rev.appointment_id
                LEFT JOIN payments pay ON a.id = pay.appointment_id
                WHERE a.patient_id = :pid
                ORDER BY a.appointment_date DESC, a.start_time DESC";
        return $this->rawQuery($sql, ['pid' => $patientId]);
    }

    /**
     * Get Doctor's Appointments for schedule/dashboard
     */
    public function getDoctorAppointments(int $doctorId, ?string $date = null, ?string $status = null): array {
        $sql = "SELECT a.*,
                       u_pat.name as patient_name, u_pat.phone as patient_phone,
                       p.dob as patient_dob, p.gender as patient_gender,
                       s.name as specialty_name, srv.name as service_name,
                       q.queue_number, q.status as queue_status
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN services srv ON a.service_id = srv.id
                LEFT JOIN examination_queues q ON a.id = q.appointment_id
                WHERE a.doctor_id = :did";
        $params = ['did' => $doctorId];

        if ($date) {
            $sql .= " AND a.appointment_date = :adate";
            $params['adate'] = $date;
        }

        if ($status) {
            $sql .= " AND a.status = :astatus";
            $params['astatus'] = $status;
        }

        $sql .= " ORDER BY a.appointment_date ASC, a.start_time ASC";
        return $this->rawQuery($sql, $params);
    }

    /**
     * Get All Appointments for Receptionist / Admin
     */
    public function searchAppointments(?string $date = null, ?string $keyword = null, ?string $status = null, ?int $doctorId = null): array {
        $sql = "SELECT a.*,
                       u_pat.name as patient_name, u_pat.phone as patient_phone,
                       u_doc.name as doctor_name, d.title as doctor_title, d.room_number,
                       s.name as specialty_name,
                       q.queue_number, q.status as queue_status,
                       pay.payment_status, pay.final_amount
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                JOIN specialties s ON a.specialty_id = s.id
                LEFT JOIN examination_queues q ON a.id = q.appointment_id
                LEFT JOIN payments pay ON a.id = pay.appointment_id
                WHERE 1=1";
        $params = [];

        if ($date) {
            $sql .= " AND a.appointment_date = :adate";
            $params['adate'] = $date;
        }

        if ($status) {
            $sql .= " AND a.status = :status";
            $params['status'] = $status;
        }

        if ($doctorId) {
            $sql .= " AND a.doctor_id = :did";
            $params['did'] = $doctorId;
        }

        if ($keyword) {
            $sql .= " AND (a.booking_code LIKE :kw1 OR u_pat.name LIKE :kw2 OR u_pat.phone LIKE :kw3)";
            $params['kw1'] = "%{$keyword}%";
            $params['kw2'] = "%{$keyword}%";
            $params['kw3'] = "%{$keyword}%";
        }

        $sql .= " ORDER BY a.appointment_date DESC, a.start_time DESC";
        return $this->rawQuery($sql, $params);
    }
}
