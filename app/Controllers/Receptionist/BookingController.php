<?php
namespace App\Controllers\Receptionist;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\Specialty;
use App\Models\Doctor;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\ExaminationQueue;

class BookingController extends Controller {
    public function create(): void {
        Auth::requireRole('receptionist');

        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->getActiveSpecialties();

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        $this->view('receptionist/walkin_booking', [
            'pageTitle' => 'Đặt lịch trực tiếp tại quầy',
            'specialties' => $specialties,
            'doctors' => $doctors
        ], 'layouts/receptionist');
    }

    public function store(): void {
        Auth::requireRole('receptionist');
        $this->validateCsrf();

        $validator = $this->validate([
            'patient_name' => 'required|min:2',
            'patient_phone' => 'required|min:9',
            'specialty_id' => 'required|numeric',
            'doctor_id' => 'required|numeric',
            'appointment_date' => 'required|date',
            'start_time' => 'required'
        ]);

        if ($validator->fails()) {
            $this->redirect('/receptionist/booking');
            return;
        }

        $email = $this->request->input('patient_email');
        if (empty($email)) {
            $email = 'walkin_' . preg_replace('/[^0-9]/', '', $this->request->input('patient_phone')) . '@medibook.local';
        }

        $userModel = new User();
        $user = $userModel->findByEmail($email);
        if (!$user) {
            $userId = $userModel->createPatientUser(
                $this->request->input('patient_name'),
                $email,
                'password',
                $this->request->input('patient_phone')
            );
            $user = $userModel->find($userId);
        }

        $patientModel = new Patient();
        $patient = $patientModel->getByUserId((int)$user['id']);
        $patientId = (int)$patient['id'];

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
            'symptoms' => $this->request->input('symptoms') ?: 'Đăng ký khám trực tiếp tại quầy'
        ]);

        if (!$result['success']) {
            Session::flash('error', $result['error'] ?? 'Không thể tạo lịch khám.');
            $this->redirect('/receptionist/booking');
            return;
        }

        $appointmentId = $result['appointment_id'];

        // Optionally check in immediately if requested
        if ($this->request->input('auto_checkin') === '1') {
            $queueModel = new ExaminationQueue();
            $checkinRes = $queueModel->checkInAppointment($appointmentId, Auth::id());
            if ($checkinRes['success']) {
                Session::flash('success', "Đã tạo lịch và tiếp đón ngay! Mã: {$result['booking_code']} - Số STT: {$checkinRes['queue_number']}");
                $this->redirect('/receptionist/checkin');
                return;
            }
        }

        Session::flash('success', "Đã tạo cuộc hẹn tại quầy thành công! Mã đặt lịch: {$result['booking_code']}");
        $this->redirect('/receptionist/checkin');
    }
}
