<?php
namespace App\Controllers\Receptionist;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\Appointment;
use App\Models\Payment;
use App\Models\ExaminationQueue;

class DashboardController extends Controller {
    public function index(): void {
        Auth::requireRole('receptionist');

        $today = date('Y-m-d');
        $appModel = new Appointment();
        $todayAppointments = $appModel->searchAppointments($today);

        $totalToday = count($todayAppointments);
        $checkedInCount = 0;
        $completedCount = 0;
        $pendingCount = 0;

        foreach ($todayAppointments as $a) {
            if ($a['status'] === 'checked_in' || $a['status'] === 'in_consultation') $checkedInCount++;
            if ($a['status'] === 'completed') $completedCount++;
            if ($a['status'] === 'confirmed' || $a['status'] === 'pending') $pendingCount++;
        }

        $paymentModel = new Payment();
        $stats = $paymentModel->getRevenueStats();

        $this->view('receptionist/dashboard', [
            'pageTitle' => 'Lễ tân - Bàn tiếp đón & Điều phối',
            'todayAppointments' => $todayAppointments,
            'totalToday' => $totalToday,
            'checkedInCount' => $checkedInCount,
            'completedCount' => $completedCount,
            'pendingCount' => $pendingCount,
            'todayRevenue' => $stats['today_revenue']
        ], 'layouts/receptionist');
    }
}
