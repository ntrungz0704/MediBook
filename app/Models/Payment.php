<?php
namespace App\Models;

use App\Core\Model;

class Payment extends Model {
    protected string $table = 'payments';

    public function getByAppointment(int $appointmentId): ?array {
        $sql = "SELECT p.*, u.name as cashier_name
                FROM payments p
                LEFT JOIN users u ON p.cashier_user_id = u.id
                WHERE p.appointment_id = :aid LIMIT 1";
        $res = $this->rawQuery($sql, ['aid' => $appointmentId]);
        return $res[0] ?? null;
    }

    public function markAsPaid(int $paymentId, string $method, ?int $cashierUserId, string $note = ''): bool {
        return $this->update($paymentId, [
            'payment_status' => 'paid',
            'payment_method' => $method,
            'paid_at' => date('Y-m-d H:i:s'),
            'cashier_user_id' => $cashierUserId,
            'note' => $note
        ]);
    }

    public function getAllPaymentsWithDetails(?string $status = null, ?string $keyword = null): array {
        $sql = "SELECT pay.*, a.booking_code, a.appointment_date,
                       u_pat.name as patient_name, u_pat.phone as patient_phone,
                       u_doc.name as doctor_name,
                       u_cash.name as cashier_name
                FROM payments pay
                JOIN appointments a ON pay.appointment_id = a.id
                JOIN patients p ON a.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                LEFT JOIN users u_cash ON pay.cashier_user_id = u_cash.id
                WHERE 1=1";
        $params = [];

        if ($status) {
            $sql .= " AND pay.payment_status = :status";
            $params['status'] = $status;
        }

        if ($keyword) {
            $sql .= " AND (pay.invoice_code LIKE :kw1 OR a.booking_code LIKE :kw2 OR u_pat.name LIKE :kw3 OR u_pat.phone LIKE :kw4)";
            $params['kw1'] = "%{$keyword}%";
            $params['kw2'] = "%{$keyword}%";
            $params['kw3'] = "%{$keyword}%";
            $params['kw4'] = "%{$keyword}%";
        }

        $sql .= " ORDER BY pay.id DESC";
        return $this->rawQuery($sql, $params);
    }

    public function getRevenueStats(): array {
        $today = date('Y-m-d');
        $thisMonth = date('Y-m-01');

        $todayRes = $this->rawQuery("SELECT SUM(final_amount) as total FROM payments WHERE payment_status = 'paid' AND DATE(paid_at) = :today", ['today' => $today]);
        $monthRes = $this->rawQuery("SELECT SUM(final_amount) as total FROM payments WHERE payment_status = 'paid' AND paid_at >= :this_month", ['this_month' => $thisMonth]);
        $totalRes = $this->rawQuery("SELECT SUM(final_amount) as total FROM payments WHERE payment_status = 'paid'");

        return [
            'today_revenue' => (float)($todayRes[0]['total'] ?? 0),
            'month_revenue' => (float)($monthRes[0]['total'] ?? 0),
            'total_revenue' => (float)($totalRes[0]['total'] ?? 0)
        ];
    }
}
