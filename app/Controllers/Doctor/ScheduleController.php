<?php
namespace App\Controllers\Doctor;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\DoctorLeave;

class ScheduleController extends Controller {
    public function index(): void {
        Auth::requireRole('doctor');

        $doctor = (new Doctor())->getByUserId(Auth::id());
        $schedules = (new DoctorSchedule())->getByDoctor((int)$doctor['id']);
        $leaves = (new DoctorLeave())->getDoctorLeaves((int)$doctor['id']);

        $this->view('doctor/schedule', [
            'pageTitle' => 'Lịch làm việc & Đăng ký nghỉ phép',
            'doctor' => $doctor,
            'schedules' => $schedules,
            'leaves' => $leaves
        ], 'layouts/doctor');
    }

    public function requestLeave(): void {
        Auth::requireRole('doctor');
        $this->validateCsrf();

        $validator = $this->validate([
            'leave_date' => 'required|date',
            'reason' => 'required|min:3'
        ]);

        if ($validator->fails()) {
            $this->redirect('/doctor/schedule');
            return;
        }

        $doctor = (new Doctor())->getByUserId(Auth::id());
        $leaveModel = new DoctorLeave();

        $leaveDate = $this->request->input('leave_date');
        if ($leaveDate < date('Y-m-d')) {
            Session::flash('error', 'Không thể đăng ký nghỉ cho ngày trong quá khứ.');
            $this->redirect('/doctor/schedule');
            return;
        }

        $existing = $leaveModel->first("doctor_id = :did AND leave_date = :ldate", [
            'did' => $doctor['id'],
            'ldate' => $leaveDate
        ]);

        if ($existing) {
            Session::flash('error', 'Bạn đã gửi yêu cầu nghỉ phép cho ngày này rồi.');
            $this->redirect('/doctor/schedule');
            return;
        }

        $leaveModel->create([
            'doctor_id' => $doctor['id'],
            'leave_date' => $leaveDate,
            'reason' => $this->request->input('reason'),
            'status' => 'approved' // Auto approve or pending
        ]);

        $this->logActivity('DOCTOR_LEAVE', 'DoctorLeave', $doctor['id'], "Đăng ký nghỉ phép ngày {$leaveDate}");
        Session::flash('success', 'Đã đăng ký ngày nghỉ thành công!');
        $this->redirect('/doctor/schedule');
    }
}
