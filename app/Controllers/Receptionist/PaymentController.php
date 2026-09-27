<?php
namespace App\Controllers\Receptionist;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Payment;
use App\Models\Appointment;
use App\Models\Prescription;

class PaymentController extends Controller {
    public function index(): void {
        Auth::requireRole(['receptionist', 'admin']);

        $status = $this->request->input('status');
        $keyword = $this->request->input('keyword');

        $paymentModel = new Payment();
        $payments = $paymentModel->getAllPaymentsWithDetails($status, $keyword);
        $stats = $paymentModel->getRevenueStats();

        $this->view('receptionist/payments', [
            'pageTitle' => 'Quầy thu ngân & Quản lý viện phí',
            'payments' => $payments,
            'status' => $status,
            'keyword' => $keyword,
            'stats' => $stats
        ], 'layouts/receptionist');
    }

    public function pay(int $paymentId): void {
        Auth::requireRole(['receptionist', 'admin']);
        $this->validateCsrf();

        $method = $this->request->input('payment_method', 'cash');
        $note = $this->request->input('note', 'Thanh toán tại quầy');

        $paymentModel = new Payment();
        $payment = $paymentModel->find($paymentId);

        if ($payment) {
            $paymentModel->markAsPaid($paymentId, $method, Auth::id(), $note);
            $this->logActivity('PAYMENT_RECEIVED', 'Payment', $paymentId, "Thu phí hóa đơn {$payment['invoice_code']}");
            Session::flash('success', "Đã thu tiền hóa đơn {$payment['invoice_code']} thành công!");
        }

        $this->redirect($_SERVER['HTTP_REFERER'] ?? '/receptionist/payments');
    }

    public function printReceipt(int $paymentId): void {
        Auth::requireLogin();

        $paymentModel = new Payment();
        $payment = $paymentModel->find($paymentId);

        if (!$payment) {
            Response::error(404, 'Không tìm thấy hóa đơn.');
            return;
        }

        $appModel = new Appointment();
        $appointment = $appModel->getDetailsById((int)$payment['appointment_id']);

        $prescription = null;
        if (!empty($appointment['prescription_id'])) {
            $prescription = (new Prescription())->getFullPrescriptionByAppointment((int)$appointment['id']);
        }

        $this->view('receptionist/receipt_print', [
            'pageTitle' => 'Biên lai thanh toán - ' . $payment['invoice_code'],
            'payment' => $payment,
            'appointment' => $appointment,
            'prescription' => $prescription
        ], null); // print view without header/footer
    }
}
