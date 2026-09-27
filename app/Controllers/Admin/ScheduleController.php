<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\DoctorSchedule;
use App\Models\DoctorLeave;
use App\Models\Doctor;

class ScheduleController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $scheduleModel = new DoctorSchedule();
        $schedules = $scheduleModel->getAllWithDoctors();

        $leaveModel = new DoctorLeave();
        $leaves = $leaveModel->getAllWithDoctors();

        $doctors = (new Doctor())->getAllDoctorsWithSpecialties(true);

        $this->view('admin/schedules/index', [
            'pageTitle' => 'Quản lý ca trực & Lịch nghỉ phép bác sĩ',
            'schedules' => $schedules,
            'leaves' => $leaves,
            'doctors' => $doctors
        ], 'layouts/admin');
    }

    public function storeSchedule(): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'doctor_id' => 'required|numeric',
            'day_of_week' => 'required|numeric',
            'start_time' => 'required',
            'end_time' => 'required'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/schedules');
            return;
        }

        $scheduleModel = new DoctorSchedule();
        $scheduleModel->create([
            'doctor_id' => (int)$this->request->input('doctor_id'),
            'day_of_week' => (int)$this->request->input('day_of_week'),
            'start_time' => $this->request->input('start_time'),
            'end_time' => $this->request->input('end_time'),
            'slot_duration' => (int)$this->request->input('slot_duration', 30),
            'max_patients' => (int)$this->request->input('max_patients', 20),
            'status' => 'active'
        ]);

        Session::flash('success', 'Thêm ca trực thành công!');
        $this->redirect('/admin/schedules');
    }

    public function deleteSchedule(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        (new DoctorSchedule())->delete($id);
        Session::flash('success', 'Đã xóa ca trực thành công.');
        $this->redirect('/admin/schedules');
    }

    public function updateLeaveStatus(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $status = $this->request->input('status', 'approved');
        (new DoctorLeave())->update($id, ['status' => $status]);

        Session::flash('success', "Đã cập nhật trạng thái nghỉ phép thành {$status}.");
        $this->redirect('/admin/schedules');
    }
}
