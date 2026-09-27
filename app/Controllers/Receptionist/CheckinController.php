<?php
namespace App\Controllers\Receptionist;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\Appointment;
use App\Models\ExaminationQueue;

class CheckinController extends Controller {
    public function index(): void {
        Auth::requireRole('receptionist');

        $keyword = $this->request->input('keyword');
        $date = $this->request->input('date', date('Y-m-d'));
        $status = $this->request->input('status');

        $appModel = new Appointment();
        $appointments = $appModel->searchAppointments($date, $keyword, $status);

        $this->view('receptionist/checkin', [
            'pageTitle' => 'Tiếp đón & Điểm danh bệnh nhân',
            'appointments' => $appointments,
            'keyword' => $keyword,
            'date' => $date,
            'status' => $status
        ], 'layouts/receptionist');
    }

    public function checkin(int $appointmentId): void {
        Auth::requireRole('receptionist');
        $this->validateCsrf();

        $queueModel = new ExaminationQueue();
        $result = $queueModel->checkInAppointment($appointmentId, Auth::id());

        if (!$result['success']) {
            Session::flash('error', $result['error'] ?? 'Không thể tiếp đón bệnh nhân này.');
        } else {
            $this->logActivity('CHECKIN_PATIENT', 'Appointment', $appointmentId, "Tiếp đón bệnh nhân - STT {$result['queue_number']}");
            Session::flash('success', "Đã tiếp đón bệnh nhân thành công! Số thứ tự khám: {$result['queue_number']} (Phòng {$result['room']})");
        }

        $this->redirect($_SERVER['HTTP_REFERER'] ?? '/receptionist/checkin');
    }

    public function confirm(int $appointmentId): void {
        Auth::requireRole('receptionist');
        $this->validateCsrf();

        $appModel = new Appointment();
        $appModel->changeStatus($appointmentId, 'confirmed', Auth::id(), 'Lễ tân xác nhận lịch hẹn qua điện thoại');

        Session::flash('success', 'Đã chuyển trạng thái sang Đã xác nhận.');
        $this->redirect($_SERVER['HTTP_REFERER'] ?? '/receptionist/checkin');
    }
}
