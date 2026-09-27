<?php
namespace App\Controllers\Receptionist;

use App\Core\Controller;
use App\Models\ExaminationQueue;
use App\Models\Doctor;

class QueueController extends Controller {
    /**
     * Màn hình gọi số sảnh chờ phòng khám (Lobby TV Board)
     */
    public function liveBoard(): void {
        $queueModel = new ExaminationQueue();
        $queueItems = $queueModel->getLiveBoardData();

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        $this->view('receptionist/live_board', [
            'pageTitle' => 'Màn hình gọi số sảnh chờ - MediBook Live Board',
            'queueItems' => $queueItems,
            'doctors' => $doctors
        ], null); // standalone clean full-screen TV view
    }

    /**
     * API for real-time polling
     */
    public function apiLive(): void {
        $queueModel = new ExaminationQueue();
        $queueItems = $queueModel->getLiveBoardData();

        $doctorModel = new Doctor();
        $doctors = $doctorModel->getAllDoctorsWithSpecialties(true);

        $this->json([
            'success' => true,
            'data' => $queueItems,
            'doctors' => $doctors,
            'timestamp' => date('H:i:s')
        ]);
    }
}
