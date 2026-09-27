<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Models\User;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\Payment;

class DashboardController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $userModel = new User();
        $totalUsers = $userModel->count();
        $totalDoctors = (new Doctor())->count();
        $totalPatients = (new Patient())->count();

        $appModel = new Appointment();
        $totalAppointments = $appModel->count();
        $todayAppointments = $appModel->count("appointment_date = :today", ['today' => date('Y-m-d')]);

        $paymentModel = new Payment();
        $revenueStats = $paymentModel->getRevenueStats();

        // Recent 10 bookings
        $recentBookings = $appModel->searchAppointments(null, null, null, null);
        $recentBookings = array_slice($recentBookings, 0, 8);

        // Status breakdown
        $statusCounts = [
            'pending' => $appModel->count("status = 'pending'"),
            'confirmed' => $appModel->count("status = 'confirmed'"),
            'checked_in' => $appModel->count("status = 'checked_in'"),
            'in_consultation' => $appModel->count("status = 'in_consultation'"),
            'completed' => $appModel->count("status = 'completed'"),
            'cancelled' => $appModel->count("status = 'cancelled'")
        ];

        $this->view('admin/dashboard', [
            'pageTitle' => 'Quản trị hệ thống MediBook',
            'totalUsers' => $totalUsers,
            'totalDoctors' => $totalDoctors,
            'totalPatients' => $totalPatients,
            'totalAppointments' => $totalAppointments,
            'todayAppointments' => $todayAppointments,
            'revenueStats' => $revenueStats,
            'recentBookings' => $recentBookings,
            'statusCounts' => $statusCounts
        ], 'layouts/admin');
    }
}
