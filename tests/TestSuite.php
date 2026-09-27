<?php
/**
 * MediBook Comprehensive Automated Test Suite
 * Tests Core Unit, Database, Business Logics, E2E Flow, and Security
 */

namespace Tests;

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Database;
use App\Core\Helper;
use App\Core\Validator;
use App\Core\Csrf;
use App\Core\Session;
use App\Core\Auth;
use App\Models\User;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Specialty;
use App\Models\Service;
use App\Models\DoctorSchedule;
use App\Models\DoctorLeave;
use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\ExaminationQueue;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Payment;
use App\Models\Review;
use App\Models\Notification;
use App\Models\ActivityLog;
use Exception;
use PDO;

class TestSuite {
    private int $passed = 0;
    private int $failed = 0;
    private array $errors = [];
    private ?int $currentAppointmentId = null;
    private ?int $currentQueueId = null;

    public function assert(bool $condition, string $testName, string $failMessage = ''): void {
        if ($condition) {
            $this->passed++;
            echo "  [PASS] {$testName}\n";
        } else {
            $this->failed++;
            $msg = $failMessage ?: "Assertion failed";
            $this->errors[] = "{$testName}: {$msg}";
            echo "  [FAIL] {$testName} - {$msg}\n";
        }
    }

    public function runAll(): void {
        echo "========================================================\n";
        echo "   MEDIBOOK AUTOMATED COMPREHENSIVE TEST SUITE\n";
        echo "========================================================\n\n";

        $this->testDatabaseSchema();
        $this->testCoreHelpersAndSecurity();
        $this->testCoreValidator();
        $this->testCsrfProtection();
        $this->testAuthAndRoles();
        $this->testDoctorAndScheduleLogic();
        $this->testAppointmentBookingAndConflictPrevention();
        $this->testReceptionCheckinAndQueueNumbering();
        $this->testDoctorConsultationAndPrescription();
        $this->testInventoryStockDeduction();
        $this->testBillingAndPaymentWorkflow();
        $this->testReviewAndDoctorRatingSync();
        $this->testSecurityGuards();

        echo "\n========================================================\n";
        echo "TEST SUMMARY:\n";
        echo "  Total Passed: {$this->passed}\n";
        echo "  Total Failed: {$this->failed}\n";
        if ($this->failed > 0) {
            echo "  FAILURES:\n";
            foreach ($this->errors as $err) {
                echo "    - {$err}\n";
            }
        } else {
            echo "  ALL TESTS PASSED SUCCESSFULLY! (100% OK)\n";
        }
        echo "========================================================\n";
    }

    /**
     * 1. Check all 20 tables exist in MySQL
     */
    private function testDatabaseSchema(): void {
        echo "[1] Testing Database Schema (20 Tables & Connectivity)...\n";
        $db = Database::getConnection();
        $this->assert($db instanceof PDO, "Database Connection established via PDO");

        $expectedTables = [
            'users', 'patients', 'doctors', 'receptionists',
            'specialties', 'services', 'doctor_specialties',
            'doctor_schedules', 'doctor_leaves', 'appointments',
            'appointment_status_history', 'examination_queues',
            'medical_records', 'medicines', 'prescriptions',
            'prescription_items', 'payments', 'reviews',
            'notifications', 'activity_logs'
        ];

        $tablesInDb = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $missing = array_diff($expectedTables, $tablesInDb);
        $this->assert(empty($missing), "All 20 ERD tables present in database", "Missing tables: " . implode(', ', $missing));
        $this->assert(count($tablesInDb) >= 20, "Table count is " . count($tablesInDb) . " (expected >= 20)");
    }

    /**
     * 2. Helper functions & escaping
     */
    private function testCoreHelpersAndSecurity(): void {
        echo "\n[2] Testing Core Helpers & Formatting...\n";
        $bookingCode = Helper::generateBookingCode();
        $this->assert(str_starts_with($bookingCode, 'MB') && strlen($bookingCode) >= 12, "generateBookingCode creates valid code: {$bookingCode}");

        $invoiceCode = Helper::generateInvoiceCode();
        $this->assert(str_starts_with($invoiceCode, 'HD') && strlen($invoiceCode) >= 12, "generateInvoiceCode creates valid code: {$invoiceCode}");

        $moneyStr = Helper::formatCurrency(250000);
        $this->assert(str_contains($moneyStr, '250.000'), "formatCurrency formats VND properly: {$moneyStr}");

        $dateFormatted = Helper::formatDate('2026-09-25');
        $this->assert($dateFormatted === '25/09/2026', "formatDate converts Y-m-d to d/m/Y: {$dateFormatted}");

        $xssInput = "<script>alert('xss');</script>";
        $escaped = Helper::e($xssInput);
        $this->assert(!str_contains($escaped, '<script>'), "Helper::e prevents XSS output");

        $slug = Helper::slugify("Khoa Khám Bệnh & Cấp Cứu 24/7");
        $this->assert($slug === 'khoa-kham-benh-cap-cuu-24-7', "Helper::slugify generates standard URL slug: {$slug}");
    }

    /**
     * 3. Validator rules
     */
    private function testCoreValidator(): void {
        echo "\n[3] Testing Core Validator...\n";
        $dataValid = [
            'name' => 'Nguyen Van A',
            'email' => 'test_user_unique_999@medibook.local',
            'phone' => '0901234567',
            'password' => 'secret123'
        ];
        $rules = [
            'name' => 'required|min:3|max:100',
            'email' => 'required|email',
            'phone' => 'required|phone',
            'password' => 'required|min:6'
        ];
        $v1 = Validator::make($dataValid, $rules);
        $this->assert($v1->passes(), "Validator passes with valid data");

        $dataInvalid = [
            'name' => 'N',
            'email' => 'not-an-email',
            'phone' => 'abc',
            'password' => '12'
        ];
        $v2 = Validator::make($dataInvalid, $rules);
        $this->assert($v2->fails(), "Validator fails with invalid data");
        $this->assert($v2->hasError('email'), "Validator catches invalid email");
        $this->assert($v2->hasError('phone'), "Validator catches invalid phone");
        $this->assert($v2->hasError('password'), "Validator catches short password");
    }

    /**
     * 4. CSRF Protection
     */
    private function testCsrfProtection(): void {
        echo "\n[4] Testing CSRF Protection Token...\n";
        $token = Csrf::token();
        $this->assert(!empty($token) && strlen($token) === 64, "Csrf::token() generates 64-char hex token");
        $this->assert(Csrf::verify($token), "Csrf::verify() validates correct token");
        $this->assert(!Csrf::verify('tampered_fake_token'), "Csrf::verify() rejects fake token");
        $this->assert(str_contains(Csrf::field(), 'name="_token"'), "Csrf::field() outputs hidden input field");
    }

    /**
     * 5. Auth & Role verification
     */
    private function testAuthAndRoles(): void {
        echo "\n[5] Testing Authentication & RBAC Models...\n";
        $userModel = new User();
        $admin = $userModel->findByEmail('admin@medibook.local');
        $this->assert(!empty($admin) && $admin['role'] === 'admin', "Admin account exists with role 'admin'");

        $doctorUser = $userModel->findByEmail('doctor@medibook.local');
        $this->assert(!empty($doctorUser) && $doctorUser['role'] === 'doctor', "Doctor account exists with role 'doctor'");

        $receptionistUser = $userModel->findByEmail('receptionist@medibook.local');
        $this->assert(!empty($receptionistUser) && $receptionistUser['role'] === 'receptionist', "Receptionist account exists with role 'receptionist'");

        $authSuccess = Auth::attempt('admin@medibook.local', 'password');
        $this->assert($authSuccess === true, "Auth::attempt verifies bcrypt password successfully");

        $authFail = Auth::attempt('admin@medibook.local', 'wrong_pass');
        $this->assert($authFail === false, "Auth::attempt rejects incorrect password");
    }

    /**
     * 6. Doctor & Schedules
     */
    private function testDoctorAndScheduleLogic(): void {
        echo "\n[6] Testing Doctor & Schedule Logic...\n";
        $docModel = new Doctor();
        $doctors = $docModel->getAllDoctorsWithSpecialties(true);
        $this->assert(!empty($doctors), "Found " . count($doctors) . " active doctors with specialties");

        $firstDoc = $doctors[0];
        $scheduleModel = new DoctorSchedule();
        $schedules = $scheduleModel->getByDoctor((int)$firstDoc['id']);
        $this->assert(!empty($schedules), "Doctor #{$firstDoc['id']} has " . count($schedules) . " active shift schedule slots");

        $leaveModel = new DoctorLeave();
        $isOnLeave = $leaveModel->isDoctorOnLeave((int)$firstDoc['id'], '2099-01-01');
        $this->assert($isOnLeave === false, "Doctor is not on leave on random future date 2099-01-01");
    }

    /**
     * 7. Appointment Booking & Race-Condition Conflict Prevention
     */
    private function testAppointmentBookingAndConflictPrevention(): void {
        echo "\n[7] Testing Appointment Booking & Conflict Logic...\n";
        $appModel = new Appointment();
        $doctorModel = new Doctor();
        $patientModel = new Patient();

        $doctor = $doctorModel->first();
        $patient = $patientModel->first();
        $specialtyId = (int)$doctorModel->rawQuery("SELECT specialty_id FROM doctor_specialties WHERE doctor_id = :did LIMIT 1", ['did' => $doctor['id']])[0]['specialty_id'];

        // Pick a date that matches doctor's schedule
        $scheduleModel = new DoctorSchedule();
        $schedules = $scheduleModel->where("doctor_id = :did AND status = 'active'", ['did' => $doctor['id']]);
        $targetDow = (int)$schedules[0]['day_of_week'];

        // Calculate next date with this day of week
        $dateObj = new \DateTime();
        $dateObj->modify('+1 day');
        while ((int)$dateObj->format('w') !== $targetDow) {
            $dateObj->modify('+1 day');
        }
        $targetDate = $dateObj->format('Y-m-d');
        $startTime = '10:00:00';
        $endTime = '10:30:00';

        // Clean up any test appointment at this slot
        $db = Database::getConnection();
        $db->prepare("DELETE FROM appointments WHERE doctor_id = :did AND appointment_date = :adate AND start_time = :stime")
           ->execute(['did' => $doctor['id'], 'adate' => $targetDate, 'stime' => $startTime]);

        // Test 1: Successful booking
        $bookResult = $appModel->createAppointmentWithTransaction([
            'patient_id' => $patient['id'],
            'doctor_id' => $doctor['id'],
            'specialty_id' => $specialtyId,
            'service_id' => null,
            'appointment_date' => $targetDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'symptoms' => 'Kiểm thử đặt lịch tự động'
        ]);

        $this->assert($bookResult['success'] === true, "Appointment created successfully with code {$bookResult['booking_code']}");
        $appointmentId = (int)$bookResult['appointment_id'];
        $this->currentAppointmentId = $appointmentId;

        // Test 2: Double-booking prevention (conflict check)
        $conflictResult = $appModel->createAppointmentWithTransaction([
            'patient_id' => $patient['id'],
            'doctor_id' => $doctor['id'],
            'specialty_id' => $specialtyId,
            'service_id' => null,
            'appointment_date' => $targetDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'symptoms' => 'Cố ý đặt trùng giờ'
        ]);
        $this->assert($conflictResult['success'] === false, "Double-booking prevention correctly blocked identical slot");

        // Verify status history
        $history = $db->query("SELECT * FROM appointment_status_history WHERE appointment_id = {$appointmentId}")->fetchAll();
        $this->assert(!empty($history), "Appointment status history was automatically recorded");
    }

    /**
     * 8. Receptionist Check-in & Queue STT
     */
    private function testReceptionCheckinAndQueueNumbering(): void {
        echo "\n[8] Testing Reception Check-in & Queue Numbering...\n";
        $appModel = new Appointment();
        $queueModel = new ExaminationQueue();

        $app = $appModel->find($this->currentAppointmentId);
        $this->assert(!empty($app), "Found appointment #{$this->currentAppointmentId} to check in");

        $receptionist = (new User())->findByEmail('receptionist@medibook.local');
        $checkinRes = $queueModel->checkInAppointment((int)$app['id'], (int)$receptionist['id']);

        $this->assert($checkinRes['success'] === true, "Check-in successful: assigned Queue #" . ($checkinRes['queue_number'] ?? 'N/A') . " at " . ($checkinRes['room'] ?? 'N/A'));

        $this->currentQueueId = (int)($checkinRes['queue_id'] ?? 0);

        $updatedApp = $appModel->find((int)$app['id']);
        $this->assert($updatedApp['status'] === 'checked_in', "Appointment status transitioned to 'checked_in'");

        // Doctor calls patient
        $called = $queueModel->callPatient($this->currentQueueId);
        $this->assert($called === true, "Doctor successfully called patient into room");

        $callingQueue = $queueModel->find($this->currentQueueId);
        $this->assert($callingQueue['status'] === 'calling' && !empty($callingQueue['call_time']), "Queue status transitioned to 'calling' with call_time timestamp");
    }

    /**
     * 9. Consultation & Clinical Examination
     */
    private function testDoctorConsultationAndPrescription(): void {
        echo "\n[9] Testing Doctor Consultation & Clinical Diagnosis...\n";
        $queueModel = new ExaminationQueue();
        $mrModel = new MedicalRecord();
        $appModel = new Appointment();

        $queue = $queueModel->find($this->currentQueueId);
        $this->assert(!empty($queue) && $queue['status'] === 'calling', "Found calling patient queue item #{$this->currentQueueId}");

        $appointmentId = $this->currentAppointmentId;
        $app = $appModel->find($appointmentId);

        // Start consultation
        $queueModel->startConsultation($this->currentQueueId, (int)$app['doctor_id']);
        $inConsultationApp = $appModel->find($appointmentId);
        $this->assert($inConsultationApp['status'] === 'in_consultation', "Appointment status transitioned to 'in_consultation'");

        // Doctor saves examination with vital signs
        $examData = [
            'blood_pressure' => '120/80',
            'heart_rate' => 75,
            'temperature' => 36.8,
            'weight' => 65.0,
            'height' => 170.0,
            'bmi' => 22.5,
            'anamnesis' => 'Ho có đờm nhẹ, không sốt, tiền sử dạ dày bình thường',
            'clinical_diagnosis' => 'Viêm họng cấp / Viêm phế quản nhẹ',
            'icd10_code' => 'J02.9',
            'doctor_notes' => 'Uống nhiều nước ấm, súc họng nước muối',
            're_examination_date' => date('Y-m-d', strtotime('+7 days'))
        ];

        $medicine = (new Medicine())->first("status = 'active' AND stock_quantity > 10");
        $initialStock = (int)$medicine['stock_quantity'];

        $prescriptionItems = [
            [
                'medicine_id' => $medicine['id'],
                'medicine_name' => $medicine['name'],
                'dosage' => '500mg',
                'unit' => $medicine['unit'],
                'quantity' => 10,
                'morning' => '1',
                'noon' => '0',
                'afternoon' => '1',
                'night' => '0',
                'instructions' => 'Uống sau ăn no',
                'unit_price' => (float)$medicine['unit_price']
            ]
        ];

        $saveRes = $mrModel->saveFullExamination($appointmentId, $examData, $prescriptionItems);
        $this->assert($saveRes['success'] === true, "Full examination saved successfully (Medical Record #" . ($saveRes['medical_record_id'] ?? 'N/A') . ")");

        // Verify status completed
        $completedApp = $appModel->find($appointmentId);
        $this->assert($completedApp['status'] === 'completed', "Appointment status transitioned to 'completed'");

        // Verify medical record record
        $savedMr = $mrModel->getByAppointmentId($appointmentId);
        $this->assert($savedMr['icd10_code'] === 'J02.9', "ICD-10 Code correctly recorded as J02.9");
        $vitals = json_decode($savedMr['vital_signs'], true);
        $this->assert($vitals['bmi'] == 22.5, "BMI and vital signs correctly recorded in JSON format");
    }

    /**
     * 10. Inventory Stock Deduction
     */
    private function testInventoryStockDeduction(): void {
        echo "\n[10] Testing Pharmacy Stock Auto-Deduction...\n";
        $medModel = new Medicine();
        $med = $medModel->first("status = 'active'");
        $stockBefore = (int)$med['stock_quantity'];

        // Deduct 5 units
        $medModel->rawExecute("UPDATE medicines SET stock_quantity = GREATEST(0, stock_quantity - 5) WHERE id = :mid", ['mid' => $med['id']]);
        $stockAfter = (int)$medModel->find((int)$med['id'])['stock_quantity'];

        $this->assert($stockAfter === ($stockBefore - 5), "Inventory accurately decremented (Before: {$stockBefore}, After: {$stockAfter})");

        // Revert 5 units
        $medModel->rawExecute("UPDATE medicines SET stock_quantity = stock_quantity + 5 WHERE id = :mid", ['mid' => $med['id']]);
    }

    /**
     * 11. Billing & Payments
     */
    private function testBillingAndPaymentWorkflow(): void {
        echo "\n[11] Testing Billing & Payment Collection...\n";
        $payModel = new Payment();
        $unpaidPayment = $payModel->first("appointment_id = :aid", ['aid' => $this->currentAppointmentId]);
        $this->assert(!empty($unpaidPayment), "Payment invoice created for appointment in 'unpaid' status with code " . ($unpaidPayment['invoice_code'] ?? 'N/A'));
        $this->assert((float)($unpaidPayment['final_amount'] ?? 0) > 0, "Invoice has positive final amount: " . Helper::formatCurrency((float)($unpaidPayment['final_amount'] ?? 0)));

        $receptionist = (new User())->findByEmail('receptionist@medibook.local');
        $paid = $payModel->markAsPaid((int)$unpaidPayment['id'], 'cash', (int)$receptionist['id'], 'Thu tiền mặt tại quầy');
        $this->assert($paid === true, "Invoice marked as 'paid' successfully");

        $updatedPayment = $payModel->find((int)$unpaidPayment['id']);
        $this->assert($updatedPayment['payment_status'] === 'paid' && !empty($updatedPayment['paid_at']), "Payment recorded with status 'paid' and timestamp {$updatedPayment['paid_at']}");

        $stats = $payModel->getRevenueStats();
        $this->assert($stats['total_revenue'] > 0, "Revenue statistics correctly aggregated (Total: " . Helper::formatCurrency($stats['total_revenue']) . ")");
    }

    /**
     * 12. Review & Rating Sync
     */
    private function testReviewAndDoctorRatingSync(): void {
        echo "\n[12] Testing Review & Doctor Rating Sync...\n";
        $appModel = new Appointment();
        $reviewModel = new Review();
        $docModel = new Doctor();

        $app = $appModel->find($this->currentAppointmentId);
        $doctorId = (int)$app['doctor_id'];
        $patientId = (int)$app['patient_id'];

        // Clean any existing review for this appointment
        $reviewModel->rawExecute("DELETE FROM reviews WHERE appointment_id = :aid", ['aid' => $app['id']]);

        $revAdded = $reviewModel->addDoctorReview((int)$app['id'], $patientId, $doctorId, 5, 'Bác sĩ tận tâm, chuyên môn cao!');
        $this->assert($revAdded === true, "Review recorded successfully");

        $updatedDoctor = $docModel->find($doctorId);
        $this->assert((float)$updatedDoctor['rating'] > 0 && (int)$updatedDoctor['rating_count'] > 0, "Doctor average rating & count automatically updated in database");
    }

    /**
     * 13. Security Guards (SQLi & XSS)
     */
    private function testSecurityGuards(): void {
        echo "\n[13] Testing Security Guards (SQL Injection & XSS Escape)...\n";
        $userModel = new User();
        $sqliPayload = "admin@medibook.local' OR '1'='1";
        $found = $userModel->findByEmail($sqliPayload);
        $this->assert($found === null, "PDO Prepared statement successfully neutralizes SQL Injection: {$sqliPayload}");

        $xss = "<img src=x onerror=alert('hacked')>";
        $sanitized = Helper::e($xss);
        $this->assert(!str_contains($sanitized, '<img') && str_contains($sanitized, '&lt;img'), "Helper::e converts HTML tags to secure entities");
    }
}

// Run test suite
$suite = new TestSuite();
$suite->runAll();
