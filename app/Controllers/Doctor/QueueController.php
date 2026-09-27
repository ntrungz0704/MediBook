<?php
namespace App\Controllers\Doctor;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Doctor;
use App\Models\ExaminationQueue;
use App\Models\Appointment;

class QueueController extends Controller {
    public function index(): void {
        Auth::requireRole('doctor');

        $doctorModel = new Doctor();
        $doctor = $doctorModel->getByUserId(Auth::id());

        $queueModel = new ExaminationQueue();
        $queueList = $queueModel->getDoctorTodayQueue((int)$doctor['id']);

        $this->view('doctor/queue', [
            'pageTitle' => 'Danh sách hàng đợi khám - ' . $doctor['room_number'],
            'doctor' => $doctor,
            'queueList' => $queueList
        ], 'layouts/doctor');
    }

    public function call(int $queueId): void {
        Auth::requireRole('doctor');
        $this->validateCsrf();

        $queueModel = new ExaminationQueue();
        $queue = $queueModel->find($queueId);

        if ($queue) {
            $queueModel->callPatient($queueId);
            $this->logActivity('CALL_PATIENT', 'Queue', $queueId, "Bác sĩ gọi bệnh nhân số {$queue['queue_number']}");
            Session::flash('success', "Đang gọi số {$queue['queue_number']} vào phòng khám.");
        }

        $this->redirect('/doctor/queue');
    }

    public function start(int $queueId): void {
        Auth::requireRole('doctor');
        $this->validateCsrf();

        $doctor = (new Doctor())->getByUserId(Auth::id());
        $queueModel = new ExaminationQueue();
        $queue = $queueModel->find($queueId);

        if ($queue) {
            $queueModel->startConsultation($queueId, (int)$doctor['id']);
            $this->redirect('/doctor/examine/' . $queue['appointment_id']);
            return;
        }

        $this->redirect('/doctor/queue');
    }

    public function skip(int $queueId): void {
        Auth::requireRole('doctor');
        $this->validateCsrf();

        $queueModel = new ExaminationQueue();
        $queueModel->update($queueId, ['status' => 'skipped']);

        Session::flash('info', 'Đã chuyển bệnh nhân sang trạng thái tạm qua lượt.');
        $this->redirect('/doctor/queue');
    }
}
