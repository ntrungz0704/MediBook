<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\Specialty;
use App\Models\Doctor;
use App\Models\Appointment;
use App\Models\Patient;

class HomeController extends Controller {
    public function index(): void {
        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->getActiveSpecialties();

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        // Upcoming appointment for logged-in patient (matching mockup mobile)
        $upcomingAppointment = null;
        if (Auth::check() && Auth::role() === 'patient') {
            $patientModel = new Patient();
            $patient = $patientModel->getByUserId(Auth::id());
            if ($patient) {
                $appModel = new Appointment();
                $apps = $appModel->where(
                    "patient_id = :pid AND status IN ('pending', 'confirmed', 'checked_in') AND appointment_date >= :today",
                    ['pid' => $patient['id'], 'today' => date('Y-m-d')],
                    "appointment_date ASC, start_time ASC",
                    1
                );
                if (!empty($apps[0])) {
                    $upcomingAppointment = $appModel->getDetailsByCode($apps[0]['booking_code']);
                }
            }
        }

        $this->view('home/index', [
            'pageTitle' => 'MediBook - Đặt lịch khám dễ dàng, chăm sóc sức khỏe chủ động',
            'specialties' => $specialties,
            'doctors' => $doctors,
            'upcomingAppointment' => $upcomingAppointment
        ]);
    }
}
