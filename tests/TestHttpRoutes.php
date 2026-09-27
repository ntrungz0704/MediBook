<?php
/**
 * MediBook HTTP Route & Controller Dispatch Test Suite
 * Tests all key public and API endpoints for correct HTTP status and response structure
 */

namespace Tests;

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Router;
use App\Controllers\HomeController;
use App\Controllers\SpecialtyPublicController;
use App\Controllers\DoctorPublicController;
use App\Controllers\AppointmentController;
use App\Controllers\Receptionist\QueueController as ReceptionQueue;

class TestHttpRoutes {
    private int $passed = 0;
    private int $failed = 0;

    public function assert(bool $condition, string $testName, string $failMsg = ''): void {
        if ($condition) {
            $this->passed++;
            echo "  [PASS] {$testName}\n";
        } else {
            $this->failed++;
            echo "  [FAIL] {$testName} - {$failMsg}\n";
        }
    }

    public function run(): void {
        echo "========================================================\n";
        echo "   MEDIBOOK HTTP ROUTE & CONTROLLER DISPATCH TESTS\n";
        echo "========================================================\n\n";

        // 1. Test Home page
        ob_start();
        $homeCtrl = new HomeController();
        $homeCtrl->index();
        $homeHtml = ob_get_clean();
        $this->assert(str_contains($homeHtml, 'MediBook') && str_contains($homeHtml, 'Khỏe hơn mỗi ngày'), "GET / (Home) renders successfully with brand title");
        $this->assert(str_contains($homeHtml, 'Chuyên khoa phổ biến') && str_contains($homeHtml, 'Bác sĩ nổi bật'), "GET / (Home) contains key sections (specialties & doctors)");

        // 2. Test Specialties page
        ob_start();
        $specCtrl = new SpecialtyPublicController();
        $specCtrl->index();
        $specHtml = ob_get_clean();
        $this->assert(str_contains($specHtml, 'Danh sách Chuyên khoa') && str_contains($specHtml, 'Nội tổng quát'), "GET /specialties renders specialty directory");

        // 3. Test Doctors directory
        ob_start();
        $docCtrl = new DoctorPublicController();
        $docCtrl->index();
        $docHtml = ob_get_clean();
        $this->assert(str_contains($docHtml, 'Đội ngũ Bác sĩ') && str_contains($docHtml, 'BS. CKII. Nguyễn Minh Đức'), "GET /doctors renders doctor directory");

        // 4. Test Booking Form
        ob_start();
        $bookCtrl = new AppointmentController();
        $bookCtrl->book();
        $bookHtml = ob_get_clean();
        $this->assert(str_contains($bookHtml, 'Đặt lịch khám trực tuyến') && str_contains($bookHtml, 'booking_specialty'), "GET /appointments/book renders 3-step booking UI");

        // 5. Test API: Doctors by specialty via CLI isolated execution
        $outDoc = shell_exec('php -r "require \'app/bootstrap.php\'; $c = new App\Controllers\AppointmentController(); $c->apiDoctorsBySpecialty(1);"');
        $dataDoc = json_decode($outDoc, true);
        $this->assert(isset($dataDoc['success']) && $dataDoc['success'] === true && !empty($dataDoc['doctors']), "API GET /api/doctors/by-specialty/1 returns JSON doctors");

        // 6. Test API: Services by specialty via CLI isolated execution
        $outSrv = shell_exec('php -r "require \'app/bootstrap.php\'; $c = new App\Controllers\AppointmentController(); $c->apiServicesBySpecialty(1);"');
        $dataSrv = json_decode($outSrv, true);
        $this->assert(isset($dataSrv['success']) && $dataSrv['success'] === true && !empty($dataSrv['services']), "API GET /api/services/by-specialty/1 returns JSON services");

        // 7. Test API: Live Queue Board via CLI isolated execution
        $outQueue = shell_exec('php -r "require \'app/bootstrap.php\'; $c = new App\Controllers\Receptionist\QueueController(); $c->apiLive();"');
        $dataQueue = json_decode($outQueue, true);
        $this->assert(isset($dataQueue['success']) && $dataQueue['success'] === true && isset($dataQueue['doctors']), "API GET /api/queue/live returns real-time queue & doctors for TV sync");

        // 8. Test Standalone Live TV Board view
        ob_start();
        $queueCtrl = new ReceptionQueue();
        $queueCtrl->liveBoard();
        $tvHtml = ob_get_clean();
        $this->assert(str_contains($tvHtml, 'MEDIBOOK - BẢNG ĐIỀU PHỐI KHÁM BỆNH') && str_contains($tvHtml, 'live_clock'), "GET /receptionist/live-board renders standalone Lobby TV board");

        echo "\n========================================================\n";
        echo "HTTP ROUTE SUMMARY:\n";
        echo "  Total Passed: {$this->passed}\n";
        echo "  Total Failed: {$this->failed}\n";
        echo "========================================================\n";
    }
}

$httpTests = new TestHttpRoutes();
$httpTests->run();
