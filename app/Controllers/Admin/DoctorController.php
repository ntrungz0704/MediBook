<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Doctor;
use App\Models\Specialty;
use App\Models\DoctorSpecialty;

class DoctorController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(false);

        $this->view('admin/doctors/index', [
            'pageTitle' => 'Quản lý danh sách bác sĩ',
            'doctors' => $doctors
        ], 'layouts/admin');
    }

    public function edit(int $id): void {
        Auth::requireRole('admin');

        $doctorModel = new Doctor();
        $doctor = $doctorModel->getDoctorById($id);

        if (!$doctor) {
            Response::error(404, 'Không tìm thấy bác sĩ.');
            return;
        }

        $specialtyModel = new Specialty();
        $allSpecialties = $specialtyModel->all();

        $selectedSpecialtyIds = !empty($doctor['specialty_ids']) ? explode(',', $doctor['specialty_ids']) : [];

        $this->view('admin/doctors/form', [
            'pageTitle' => 'Chỉnh sửa thông tin bác sĩ - ' . $doctor['name'],
            'doctor' => $doctor,
            'allSpecialties' => $allSpecialties,
            'selectedSpecialtyIds' => $selectedSpecialtyIds
        ], 'layouts/admin');
    }

    public function update(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'title' => 'required',
            'room_number' => 'required',
            'consultation_fee' => 'required|numeric',
            'experience_years' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/doctors/edit/' . $id);
            return;
        }

        $doctorModel = new Doctor();
        $doctorModel->update($id, [
            'title' => $this->request->input('title'),
            'room_number' => $this->request->input('room_number'),
            'consultation_fee' => (float)$this->request->input('consultation_fee'),
            'experience_years' => (int)$this->request->input('experience_years'),
            'bio' => $this->request->input('bio')
        ]);

        // Sync specialties
        $specialtyIds = (array)$this->request->input('specialty_ids', []);
        $primaryId = !empty($specialtyIds[0]) ? (int)$specialtyIds[0] : 0;
        (new DoctorSpecialty())->syncDoctorSpecialties($id, $specialtyIds, $primaryId);

        $this->logActivity('ADMIN_UPDATE_DOCTOR', 'Doctor', $id, "Cập nhật thông tin bác sĩ ID {$id}");
        Session::flash('success', 'Cập nhật hồ sơ bác sĩ thành công!');
        $this->redirect('/admin/doctors');
    }
}
