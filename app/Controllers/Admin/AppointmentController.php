<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Specialty;

class AppointmentController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $date = $this->request->input('date');
        $status = $this->request->input('status');
        $keyword = $this->request->input('keyword');
        $doctorId = (int)$this->request->input('doctor_id', 0);

        $appModel = new Appointment();
        $appointments = $appModel->searchAppointments($date, $keyword, $status, $doctorId ?: null);

        $doctors = (new Doctor())->getAllDoctorsWithSpecialties(true);

        $this->view('admin/appointments/index', [
            'pageTitle' => 'Quản lý lịch hẹn khám',
            'appointments' => $appointments,
            'doctors' => $doctors,
            'date' => $date,
            'status' => $status,
            'keyword' => $keyword,
            'doctorId' => $doctorId
        ], 'layouts/admin');
    }

    public function viewDetails(int $id): void {
        Auth::requireRole('admin');

        $appModel = new Appointment();
        $appointment = $appModel->getDetailsById($id);

        if (!$appointment) {
            Response::error(404, 'Không tìm thấy lịch hẹn.');
            return;
        }

        $prescription = null;
        if (!empty($appointment['prescription_id'])) {
            $prescription = (new \App\Models\Prescription())->getFullPrescriptionByAppointment($id);
        }

        $history = (new \App\Models\AppointmentStatusHistory())->getByAppointment($id);

        $this->view('admin/appointments/view', [
            'pageTitle' => 'Chi tiết lịch hẹn - ' . $appointment['booking_code'],
            'app' => $appointment,
            'prescription' => $prescription,
            'history' => $history
        ], 'layouts/admin');
    }

    public function updateStatus(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $status = $this->request->input('status');
        $note = $this->request->input('note', 'Quản trị viên cập nhật trạng thái');

        $appModel = new Appointment();
        $appModel->changeStatus($id, $status, Auth::id(), $note);

        Session::flash('success', "Đã cập nhật trạng thái lịch hẹn thành công.");
        $this->redirect($_SERVER['HTTP_REFERER'] ?? '/admin/appointments');
    }
}
