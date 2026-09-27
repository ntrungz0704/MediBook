<?php
namespace App\Models;

use App\Core\Model;

class Doctor extends Model {
    protected string $table = 'doctors';

    public function getAllDoctorsWithSpecialties(bool $activeOnly = true): array {
        $sql = "SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status,
                       GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') as specialty_names,
                       GROUP_CONCAT(DISTINCT s.id SEPARATOR ',') as specialty_ids
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
                LEFT JOIN specialties s ON ds.specialty_id = s.id";

        if ($activeOnly) {
            $sql .= " WHERE u.status = 'active'";
        }

        $sql .= " GROUP BY d.id ORDER BY d.rating DESC, d.experience_years DESC";
        return $this->rawQuery($sql);
    }

    public function getDoctorById(int $doctorId): ?array {
        $sql = "SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status,
                       GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') as specialty_names,
                       GROUP_CONCAT(DISTINCT s.id SEPARATOR ',') as specialty_ids
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
                LEFT JOIN specialties s ON ds.specialty_id = s.id
                WHERE d.id = :id
                GROUP BY d.id LIMIT 1";
        $res = $this->rawQuery($sql, ['id' => $doctorId]);
        return $res[0] ?? null;
    }

    public function getByUserId(int $userId): ?array {
        $sql = "SELECT d.*, u.name, u.email, u.phone, u.avatar
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                WHERE d.user_id = :uid LIMIT 1";
        $res = $this->rawQuery($sql, ['uid' => $userId]);
        return $res[0] ?? null;
    }

    public function getDoctorsBySpecialty(int $specialtyId): array {
        $sql = "SELECT d.*, u.name, u.email, u.phone, u.avatar, s.name as primary_specialty
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                JOIN doctor_specialties ds ON d.id = ds.doctor_id
                JOIN specialties s ON ds.specialty_id = s.id
                WHERE ds.specialty_id = :sid AND u.status = 'active'
                ORDER BY d.rating DESC";
        return $this->rawQuery($sql, ['sid' => $specialtyId]);
    }

    /**
     * Calculate available booking time slots for a doctor on a specific date
     */
    public function getAvailableSlots(int $doctorId, string $date): array {
        $dateTimestamp = strtotime($date);
        if (!$dateTimestamp) {
            return ['error' => 'Ngày khám không hợp lệ'];
        }

        $todayDate = date('Y-m-d');
        if ($date < $todayDate) {
            return ['error' => 'Không thể đặt lịch cho ngày trong quá khứ', 'slots' => []];
        }

        // 1. Check if doctor is on approved leave
        $leaveModel = new DoctorLeave();
        if ($leaveModel->isDoctorOnLeave($doctorId, $date)) {
            return ['error' => 'Bác sĩ có lịch nghỉ phép vào ngày này. Vui lòng chọn ngày khác.', 'slots' => []];
        }

        // 2. Get Doctor's schedule for this day of week (0=Sunday ... 6=Saturday)
        $dayOfWeek = (int)date('w', $dateTimestamp);
        $scheduleModel = new DoctorSchedule();
        $schedule = $scheduleModel->first(
            "doctor_id = :did AND day_of_week = :dow AND status = 'active'",
            ['did' => $doctorId, 'dow' => $dayOfWeek]
        );

        if (!$schedule) {
            return ['error' => 'Bác sĩ không có lịch trực vào ngày này.', 'slots' => []];
        }

        // 3. Get existing booked appointments
        $appModel = new Appointment();
        $bookedAppointments = $appModel->rawQuery(
            "SELECT start_time, end_time FROM appointments 
             WHERE doctor_id = :did AND appointment_date = :adate 
             AND status NOT IN ('cancelled', 'no_show')",
            ['did' => $doctorId, 'adate' => $date]
        );

        // 4. Generate slots based on schedule
        $startTime = strtotime($date . ' ' . $schedule['start_time']);
        $endTime = strtotime($date . ' ' . $schedule['end_time']);
        $slotDurationSeconds = ($schedule['slot_duration'] ?: 30) * 60;

        $currentTime = time();
        $slots = [];

        for ($t = $startTime; $t + $slotDurationSeconds <= $endTime; $t += $slotDurationSeconds) {
            $slotStart = date('H:i:s', $t);
            $slotEnd = date('H:i:s', $t + $slotDurationSeconds);
            $displayTime = date('H:i', $t) . ' - ' . date('H:i', $t + $slotDurationSeconds);

            $isAvailable = true;

            // If appointment date is today, slot must be at least 30 minutes in future
            if ($date === $todayDate && $t <= ($currentTime + 1800)) {
                $isAvailable = false;
            }

            // Check against booked appointments
            if ($isAvailable) {
                foreach ($bookedAppointments as $booked) {
                    $bStart = $booked['start_time'];
                    $bEnd = $booked['end_time'];

                    // Overlap condition: max(start1, start2) < min(end1, end2)
                    if (max($slotStart, $bStart) < min($slotEnd, $bEnd)) {
                        $isAvailable = false;
                        break;
                    }
                }
            }

            $slots[] = [
                'start_time' => $slotStart,
                'end_time' => $slotEnd,
                'display' => $displayTime,
                'available' => $isAvailable
            ];
        }

        return ['error' => null, 'slots' => $slots];
    }
}
