<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Specialty;
use App\Models\Doctor;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\Review;

class AppointmentController extends Controller {
    /**
     * Show booking wizard page
     */
    public function book(): void {
        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->getActiveSpecialties();

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        $selectedSpecialtyId = (int)$this->request->input('specialty_id', 0);
        $selectedDoctorId = (int)$this->request->input('doctor_id', 0);
        $selectedDate = $this->request->input('date', date('Y-m-d'));

        // Current patient profile if logged in
        $patient = null;
        if (Auth::check() && Auth::role() === 'patient') {
            $patient = (new Patient())->getByUserId(Auth::id());
        }

        $this->view('appointments/book', [
            'pageTitle' => 'Đặt lịch khám trực tuyến - MediBook',
            'specialties' => $specialties,
            'doctors' => $doctors,
            'selectedSpecialtyId' => $selectedSpecialtyId,
            'selectedDoctorId' => $selectedDoctorId,
            'selectedDate' => $selectedDate,
            'patient' => $patient
        ]);
    }

    /**
     * API: Get Doctors by Specialty ID
     */
    public function apiDoctorsBySpecialty(string $specialtyId): void {
        $doctorModel = new Doctor();
        $doctors = $doctorModel->getDoctorsBySpecialty((int)$specialtyId);
        $this->json(['success' => true, 'doctors' => $doctors]);
    }

    /**
     * API: Get Services by Specialty ID
     */
    public function apiServicesBySpecialty(string $specialtyId): void {
        $serviceModel = new Service();
        $services = $serviceModel->getBySpecialty((int)$specialtyId);
        $this->json(['success' => true, 'services' => $services]);
    }

    /**
     * API: Get Available Slots for Doctor & Date
     */
    public function apiSlots(): void {
        $doctorId = (int)$this->request->input('doctor_id');
        $date = $this->request->input('date');

        if (!$doctorId || !$date) {
            $this->json(['success' => false, 'error' => 'Thiếu thông tin bác sĩ hoặc ngày khám'], 400);
            return;
        }

        $doctorModel = new Doctor();
        $result = $doctorModel->getAvailableSlots($doctorId, $date);

        if (!empty($result['error'])) {
            $this->json(['success' => false, 'error' => $result['error'], 'slots' => []]);
            return;
        }

        $this->json(['success' => true, 'slots' => $result['slots']]);
    }

    /**
     * Store Appointment
     */
    public function store(): void {
        $this->validateCsrf();

        // If not logged in, patient info fields are required to auto-register
        if (!Auth::check()) {
            $validator = $this->validate([
                'patient_name' => 'required|min:2',
                'patient_email' => 'required|email',
                'patient_phone' => 'required|min:9',
                'specialty_id' => 'required|numeric',
                'doctor_id' => 'required|numeric',
                'appointment_date' => 'required|date',
                'start_time' => 'required'
            ]);

            if ($validator->fails()) {
                $this->redirect('/appointments/book');
                return;
            }

            // Check or create patient user
            $userModel = new User();
            $email = $this->request->input('patient_email');
            $user = $userModel->findByEmail($email);

            if (!$user) {
                // Auto create account with default password 'password'
                $userId = $userModel->createPatientUser(
                    $this->request->input('patient_name'),
                    $email,
                    'password',
                    $this->request->input('patient_phone')
                );
                $user = $userModel->find($userId);
            }
            Auth::login($user);
        }

        // Get patient profile ID
        $patientModel = new Patient();
        $patient = $patientModel->getByUserId(Auth::id());
        if (!$patient) {
            $patientId = (int)$patientModel->create(['user_id' => Auth::id()]);
        } else {
            $patientId = (int)$patient['id'];
        }

        // Calculate end_time (30 minutes after start_time)
        $startTime = $this->request->input('start_time');
        $endTime = date('H:i:s', strtotime($startTime) + 1800);

        $appModel = new Appointment();
        $result = $appModel->createAppointmentWithTransaction([
            'patient_id' => $patientId,
            'doctor_id' => (int)$this->request->input('doctor_id'),
            'specialty_id' => (int)$this->request->input('specialty_id'),
            'service_id' => $this->request->input('service_id') ?: null,
            'appointment_date' => $this->request->input('appointment_date'),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'symptoms' => $this->request->input('symptoms')
        ]);

        if (!$result['success']) {
            Session::flash('error', $result['error'] ?? 'Không thể đặt lịch. Vui lòng thử lại.');
            $this->redirect('/appointments/book');
            return;
        }

        $this->logActivity('BOOK_APPOINTMENT', 'Appointment', $result['appointment_id'], "Đặt lịch hẹn mã {$result['booking_code']}");
        $this->redirect('/appointments/success/' . $result['booking_code']);
    }

    /**
     * Booking Success View
     */
    public function success(string $bookingCode): void {
        $appModel = new Appointment();
        $appointment = $appModel->getDetailsByCode($bookingCode);

        if (!$appointment) {
            Response::error(404, 'Không tìm thấy thông tin lịch hẹn.');
            return;
        }

        $this->view('appointments/success', [
            'pageTitle' => 'Đặt lịch thành công - ' . $bookingCode,
            'app' => $appointment
        ]);
    }

    /**
     * Appointment Details View & Voucher
     */
    public function detail(string $bookingCode): void {
        $appModel = new Appointment();
        $appointment = $appModel->getDetailsByCode($bookingCode);

        if (!$appointment) {
            Response::error(404, 'Không tìm thấy thông tin lịch hẹn.');
            return;
        }

        // Security: only the patient themselves, receptionist, doctor or admin can view
        if (Auth::role() === 'patient') {
            $patient = (new Patient())->getByUserId(Auth::id());
            if (!$patient || (int)$patient['id'] !== (int)$appointment['patient_id']) {
                Response::error(403, 'Bạn không có quyền xem thông tin lịch hẹn của người khác.');
                return;
            }
        }

        // Get medical record & prescription details if completed
        $prescription = null;
        if (!empty($appointment['prescription_id'])) {
            $prescription = (new \App\Models\Prescription())->getFullPrescriptionByAppointment((int)$appointment['id']);
        }

        $review = (new Review())->first("appointment_id = :aid", ['aid' => $appointment['id']]);

        $this->view('appointments/detail', [
            'pageTitle' => 'Chi tiết lịch hẹn - ' . $bookingCode,
            'app' => $appointment,
            'prescription' => $prescription,
            'review' => $review
        ]);
    }

    /**
     * Patient's Appointments List ("Lịch của tôi")
     */
    public function myAppointments(): void {
        Auth::requireRole('patient');

        $patient = (new Patient())->getByUserId(Auth::id());
        $appointments = [];
        if ($patient) {
            $appModel = new Appointment();
            $appointments = $appModel->getPatientAppointments((int)$patient['id']);
        }

        $this->view('appointments/index', [
            'pageTitle' => 'Lịch khám của tôi - MediBook',
            'appointments' => $appointments
        ]);
    }

    /**
     * Patient Cancels Appointment
     */
    public function cancel(string $bookingCode): void {
        Auth::requireLogin();
        $this->validateCsrf();

        $appModel = new Appointment();
        $app = $appModel->first("booking_code = :code", ['code' => $bookingCode]);

        if (!$app) {
            Response::error(404);
            return;
        }

        if (in_array($app['status'], ['completed', 'cancelled', 'in_consultation'])) {
            Session::flash('error', 'Lịch hẹn không thể hủy ở trạng thái hiện tại.');
            $this->redirect('/appointments/' . $bookingCode);
            return;
        }

        $reason = $this->request->input('cancellation_reason', 'Bệnh nhân chủ động hủy hẹn');
        $appModel->update($app['id'], [
            'status' => 'cancelled',
            'cancellation_reason' => $reason
        ]);
        $appModel->changeStatus((int)$app['id'], 'cancelled', Auth::id(), 'Hủy lịch hẹn: ' . $reason);

        $this->logActivity('CANCEL_APPOINTMENT', 'Appointment', $app['id'], "Hủy lịch hẹn {$bookingCode}");
        Session::flash('success', 'Đã hủy lịch hẹn thành công.');
        $this->redirect('/appointments/' . $bookingCode);
    }

    /**
     * Submit Doctor Review after completed appointment
     */
    public function storeReview(string $bookingCode): void {
        Auth::requireRole('patient');
        $this->validateCsrf();

        $appModel = new Appointment();
        $app = $appModel->first("booking_code = :code", ['code' => $bookingCode]);

        if (!$app || $app['status'] !== 'completed') {
            Session::flash('error', 'Chỉ có thể đánh giá sau khi đã hoàn tất khám.');
            $this->redirect('/appointments/' . $bookingCode);
            return;
        }

        $rating = (int)$this->request->input('rating', 5);
        $comment = $this->request->input('comment', '');
        $isAnonymous = (bool)$this->request->input('is_anonymous', false);

        $patient = (new Patient())->getByUserId(Auth::id());
        if ($patient && (int)$patient['id'] === (int)$app['patient_id']) {
            $reviewModel = new Review();
            $reviewModel->addDoctorReview((int)$app['id'], (int)$patient['id'], (int)$app['doctor_id'], $rating, $comment, $isAnonymous);
            Session::flash('success', 'Cảm ơn bạn đã gửi đánh giá cho bác sĩ!');
        }

        $this->redirect('/appointments/' . $bookingCode);
    }
}
