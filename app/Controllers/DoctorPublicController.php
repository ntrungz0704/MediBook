<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Doctor;
use App\Models\Review;
use App\Models\DoctorSchedule;

class DoctorPublicController extends Controller {
    public function index(): void {
        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        $this->view('doctors/index', [
            'pageTitle' => 'Đội ngũ bác sĩ chuyên khoa - MediBook',
            'doctors' => $doctors
        ]);
    }

    public function detail(int $id): void {
        $doctorModel = new Doctor();
        $doctor = $doctorModel->getDoctorById($id);

        if (!$doctor) {
            Response::error(404, 'Không tìm thấy thông tin bác sĩ.');
            return;
        }

        $reviewModel = new Review();
        $reviews = $reviewModel->getDoctorReviews($id, 10);

        $scheduleModel = new DoctorSchedule();
        $schedules = $scheduleModel->getByDoctor($id);

        $this->view('doctors/detail', [
            'pageTitle' => $doctor['title'] . ' ' . $doctor['name'] . ' - MediBook',
            'doctor' => $doctor,
            'reviews' => $reviews,
            'schedules' => $schedules
        ]);
    }
}
