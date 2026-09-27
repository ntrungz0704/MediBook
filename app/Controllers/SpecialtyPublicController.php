<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Specialty;
use App\Models\Doctor;
use App\Models\Service;

class SpecialtyPublicController extends Controller {
    public function index(): void {
        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->getActiveSpecialties();

        $this->view('specialties/index', [
            'pageTitle' => 'Chuyên khoa khám bệnh - MediBook',
            'specialties' => $specialties
        ]);
    }

    public function detail(string $slug): void {
        $specialtyModel = new Specialty();
        $specialty = $specialtyModel->getBySlug($slug);

        if (!$specialty) {
            Response::error(404, 'Không tìm thấy chuyên khoa yêu cầu.');
            return;
        }

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getDoctorsBySpecialty((int)$specialty['id']);

        $serviceModel = new Service();
        $services = $serviceModel->getBySpecialty((int)$specialty['id']);

        $this->view('specialties/detail', [
            'pageTitle' => $specialty['name'] . ' - MediBook',
            'specialty' => $specialty,
            'doctors' => $doctors,
            'services' => $services
        ]);
    }
}
