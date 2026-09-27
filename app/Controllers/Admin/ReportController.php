<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\Payment;
use App\Models\Appointment;

class ReportController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $paymentModel = new Payment();
        $stats = $paymentModel->getRevenueStats();

        // Revenue by month
        $monthlyRevenue = $paymentModel->rawQuery(
            "SELECT DATE_FORMAT(paid_at, '%m/%Y') as month, 
                    SUM(final_amount) as total_amount, 
                    COUNT(*) as invoice_count 
             FROM payments 
             WHERE payment_status = 'paid' 
             GROUP BY month 
             ORDER BY MAX(paid_at) DESC LIMIT 12"
        );

        // Appointments by specialty
        $appModel = new Appointment();
        $bySpecialty = $appModel->rawQuery(
            "SELECT s.name as specialty_name, COUNT(a.id) as total_appointments
             FROM specialties s
             LEFT JOIN appointments a ON s.id = a.specialty_id
             GROUP BY s.id
             ORDER BY total_appointments DESC"
        );

        $this->view('admin/reports/index', [
            'pageTitle' => 'Báo cáo thống kê & Doanh thu',
            'stats' => $stats,
            'monthlyRevenue' => $monthlyRevenue,
            'bySpecialty' => $bySpecialty
        ], 'layouts/admin');
    }
}
