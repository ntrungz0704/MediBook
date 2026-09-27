<?php
namespace App\Controllers\Doctor;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\Doctor;
use App\Models\Appointment;
use App\Models\ExaminationQueue;

class DashboardController extends Controller {
    public function index(): void {
        Auth::requireRole('doctor');

        $doctorModel = new Doctor();
        $doctor = $doctorModel->getByUserId(Auth::id());

        if (!$doctor) {
            $this->redirect('/');
            return;
        }

        $today = date('Y-m-d');
        $appModel = new Appointment();
        $todayAppointments = $appModel->getDoctorAppointments((int)$doctor['id'], $today);

        $queueModel = new ExaminationQueue();
        $todayQueue = $queueModel->getDoctorTodayQueue((int)$doctor['id']);

        $totalToday = count($todayAppointments);
        $waitingCount = 0;
        $completedToday = 0;
        foreach ($todayAppointments as $a) {
            if ($a['status'] === 'completed') $completedToday++;
            if (in_array($a['status'], ['checked_in', 'waiting'])) $waitingCount++;
        }

        $this->view('doctor/dashboard', [
            'pageTitle' => 'Bác sĩ - Tổng quan phòng khám',
            'doctor' => $doctor,
            'todayQueue' => $todayQueue,
            'totalToday' => $totalToday,
            'waitingCount' => $waitingCount,
            'completedToday' => $completedToday
        ], 'layouts/doctor');
    }
}
