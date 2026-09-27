<?php
/**
 * MediBook - Public Entry Point & Route Definitions
 */

// If running with PHP built-in web server, let static files be served directly
if (php_sapi_name() === 'cli-server') {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . $uri;
    if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
        return false;
    }
}

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Router;
use App\Controllers\HomeController;
use App\Controllers\AuthController;
use App\Controllers\AppointmentController;
use App\Controllers\ProfileController;
use App\Controllers\SpecialtyPublicController;
use App\Controllers\DoctorPublicController;
use App\Controllers\Doctor\DashboardController as DoctorDashboard;
use App\Controllers\Doctor\QueueController as DoctorQueue;
use App\Controllers\Doctor\ExaminationController as DoctorExam;
use App\Controllers\Doctor\ScheduleController as DoctorScheduleCtrl;
use App\Controllers\Receptionist\DashboardController as ReceptionDashboard;
use App\Controllers\Receptionist\CheckinController as ReceptionCheckin;
use App\Controllers\Receptionist\QueueController as ReceptionQueue;
use App\Controllers\Receptionist\BookingController as ReceptionBooking;
use App\Controllers\Receptionist\PaymentController as ReceptionPayment;
use App\Controllers\Admin\DashboardController as AdminDashboard;
use App\Controllers\Admin\UserController as AdminUser;
use App\Controllers\Admin\DoctorController as AdminDoctor;
use App\Controllers\Admin\SpecialtyController as AdminSpecialty;
use App\Controllers\Admin\ServiceController as AdminService;
use App\Controllers\Admin\MedicineController as AdminMedicine;
use App\Controllers\Admin\ScheduleController as AdminSchedule;
use App\Controllers\Admin\AppointmentController as AdminAppointment;
use App\Controllers\Admin\ReportController as AdminReport;
use App\Controllers\Admin\LogController as AdminLog;

$router = new Router();

// ================= PUBLIC ROUTES =================
$router->get('/', [HomeController::class, 'index']);

// Authentication
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/register', [AuthController::class, 'showRegister']);
$router->post('/register', [AuthController::class, 'register']);
$router->get('/logout', [AuthController::class, 'logout']);

// Public Directories
$router->get('/specialties', [SpecialtyPublicController::class, 'index']);
$router->get('/specialties/{slug}', [SpecialtyPublicController::class, 'detail']);
$router->get('/doctors', [DoctorPublicController::class, 'index']);
$router->get('/doctors/{id}', [DoctorPublicController::class, 'detail']);

// Booking Flow
$router->get('/book', [AppointmentController::class, 'book']);
$router->get('/booking', [AppointmentController::class, 'book']);
$router->get('/appointments/book', [AppointmentController::class, 'book']);
$router->post('/appointments/book', [AppointmentController::class, 'store']);
$router->get('/appointments/success/{code}', [AppointmentController::class, 'success']);
$router->get('/appointments/{code}', [AppointmentController::class, 'detail']);
$router->post('/appointments/{code}/cancel', [AppointmentController::class, 'cancel'], ['auth']);
$router->post('/appointments/{code}/review', [AppointmentController::class, 'storeReview'], ['auth']);
$router->get('/my-appointments', [AppointmentController::class, 'myAppointments'], ['auth', 'role:patient']);

// Profile
$router->get('/profile', [ProfileController::class, 'index'], ['auth']);
$router->post('/profile', [ProfileController::class, 'update'], ['auth']);
$router->post('/profile/password', [ProfileController::class, 'changePassword'], ['auth']);

// APIs for AJAX
$router->get('/api/doctors/by-specialty/{specialtyId}', [AppointmentController::class, 'apiDoctorsBySpecialty']);
$router->get('/api/services/by-specialty/{specialtyId}', [AppointmentController::class, 'apiServicesBySpecialty']);
$router->get('/api/slots', [AppointmentController::class, 'apiSlots']);
$router->get('/api/queue/live', [ReceptionQueue::class, 'apiLive']);

// ================= DOCTOR ROUTES =================
$router->get('/doctor/dashboard', [DoctorDashboard::class, 'index'], ['auth', 'role:doctor']);
$router->get('/doctor/queue', [DoctorQueue::class, 'index'], ['auth', 'role:doctor']);
$router->post('/doctor/queue/call/{id}', [DoctorQueue::class, 'call'], ['auth', 'role:doctor']);
$router->post('/doctor/queue/start/{id}', [DoctorQueue::class, 'start'], ['auth', 'role:doctor']);
$router->post('/doctor/queue/skip/{id}', [DoctorQueue::class, 'skip'], ['auth', 'role:doctor']);
$router->get('/doctor/examine/{appointmentId}', [DoctorExam::class, 'examine'], ['auth', 'role:doctor']);
$router->post('/doctor/examine/{appointmentId}', [DoctorExam::class, 'store'], ['auth', 'role:doctor']);
$router->get('/doctor/schedule', [DoctorScheduleCtrl::class, 'index'], ['auth', 'role:doctor']);
$router->post('/doctor/leave/request', [DoctorScheduleCtrl::class, 'requestLeave'], ['auth', 'role:doctor']);

// ================= RECEPTIONIST ROUTES =================
$router->get('/receptionist/dashboard', [ReceptionDashboard::class, 'index'], ['auth', 'role:receptionist,admin']);
$router->get('/receptionist/checkin', [ReceptionCheckin::class, 'index'], ['auth', 'role:receptionist,admin']);
$router->post('/receptionist/checkin/{id}', [ReceptionCheckin::class, 'checkin'], ['auth', 'role:receptionist,admin']);
$router->post('/receptionist/confirm/{id}', [ReceptionCheckin::class, 'confirm'], ['auth', 'role:receptionist,admin']);
$router->get('/receptionist/live-board', [ReceptionQueue::class, 'liveBoard']);
$router->get('/receptionist/queue/board', [ReceptionQueue::class, 'liveBoard']);
$router->get('/receptionist/booking', [ReceptionBooking::class, 'create'], ['auth', 'role:receptionist,admin']);
$router->post('/receptionist/booking', [ReceptionBooking::class, 'store'], ['auth', 'role:receptionist,admin']);
$router->get('/receptionist/payments', [ReceptionPayment::class, 'index'], ['auth', 'role:receptionist,admin']);
$router->post('/receptionist/payments/pay/{id}', [ReceptionPayment::class, 'pay'], ['auth', 'role:receptionist,admin']);
$router->get('/receptionist/payments/receipt/{id}', [ReceptionPayment::class, 'printReceipt'], ['auth', 'role:receptionist,admin']);

// ================= ADMIN ROUTES =================
$router->get('/admin/dashboard', [AdminDashboard::class, 'index'], ['auth', 'role:admin']);

// User Management
$router->get('/admin/users', [AdminUser::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/users/create', [AdminUser::class, 'create'], ['auth', 'role:admin']);
$router->post('/admin/users/store', [AdminUser::class, 'store'], ['auth', 'role:admin']);
$router->get('/admin/users/edit/{id}', [AdminUser::class, 'edit'], ['auth', 'role:admin']);
$router->post('/admin/users/update/{id}', [AdminUser::class, 'update'], ['auth', 'role:admin']);
$router->post('/admin/users/toggle/{id}', [AdminUser::class, 'toggleStatus'], ['auth', 'role:admin']);

// Doctor Management
$router->get('/admin/doctors', [AdminDoctor::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/doctors/edit/{id}', [AdminDoctor::class, 'edit'], ['auth', 'role:admin']);
$router->post('/admin/doctors/update/{id}', [AdminDoctor::class, 'update'], ['auth', 'role:admin']);

// Specialty Management
$router->get('/admin/specialties', [AdminSpecialty::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/specialties/create', [AdminSpecialty::class, 'create'], ['auth', 'role:admin']);
$router->post('/admin/specialties/store', [AdminSpecialty::class, 'store'], ['auth', 'role:admin']);
$router->get('/admin/specialties/edit/{id}', [AdminSpecialty::class, 'edit'], ['auth', 'role:admin']);
$router->post('/admin/specialties/update/{id}', [AdminSpecialty::class, 'update'], ['auth', 'role:admin']);

// Service Management
$router->get('/admin/services', [AdminService::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/services/create', [AdminService::class, 'create'], ['auth', 'role:admin']);
$router->post('/admin/services/store', [AdminService::class, 'store'], ['auth', 'role:admin']);
$router->get('/admin/services/edit/{id}', [AdminService::class, 'edit'], ['auth', 'role:admin']);
$router->post('/admin/services/update/{id}', [AdminService::class, 'update'], ['auth', 'role:admin']);

// Medicine Inventory
$router->get('/admin/medicines', [AdminMedicine::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/medicines/create', [AdminMedicine::class, 'create'], ['auth', 'role:admin']);
$router->post('/admin/medicines/store', [AdminMedicine::class, 'store'], ['auth', 'role:admin']);
$router->get('/admin/medicines/edit/{id}', [AdminMedicine::class, 'edit'], ['auth', 'role:admin']);
$router->post('/admin/medicines/update/{id}', [AdminMedicine::class, 'update'], ['auth', 'role:admin']);

// Shift & Leave Management
$router->get('/admin/schedules', [AdminSchedule::class, 'index'], ['auth', 'role:admin']);
$router->post('/admin/schedules/store', [AdminSchedule::class, 'store'], ['auth', 'role:admin']);
$router->post('/admin/schedules/delete/{id}', [AdminSchedule::class, 'deleteSchedule'], ['auth', 'role:admin']);
$router->post('/admin/leaves/update/{id}', [AdminSchedule::class, 'updateLeaveStatus'], ['auth', 'role:admin']);

// Appointments
$router->get('/admin/appointments', [AdminAppointment::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/appointments/view/{id}', [AdminAppointment::class, 'viewDetails'], ['auth', 'role:admin']);
$router->post('/admin/appointments/status/{id}', [AdminAppointment::class, 'updateStatus'], ['auth', 'role:admin']);

// Reports & Logs
$router->get('/admin/reports', [AdminReport::class, 'index'], ['auth', 'role:admin']);
$router->get('/admin/logs', [AdminLog::class, 'index'], ['auth', 'role:admin']);

// Execute Request
$router->dispatch();
