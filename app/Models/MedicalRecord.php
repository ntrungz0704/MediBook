<?php
namespace App\Models;

use App\Core\Model;
use App\Core\Database;
use App\Core\Helper;
use Exception;

class MedicalRecord extends Model {
    protected string $table = 'medical_records';

    public function getByAppointmentId(int $appointmentId): ?array {
        $sql = "SELECT mr.*, 
                       u_pat.name as patient_name, p.dob as patient_dob, p.gender as patient_gender,
                       u_doc.name as doctor_name, d.title as doctor_title, d.room_number
                FROM medical_records mr
                JOIN patients p ON mr.patient_id = p.id
                JOIN users u_pat ON p.user_id = u_pat.id
                JOIN doctors d ON mr.doctor_id = d.id
                JOIN users u_doc ON d.user_id = u_doc.id
                WHERE mr.appointment_id = :aid LIMIT 1";
        $res = $this->rawQuery($sql, ['aid' => $appointmentId]);
        return $res[0] ?? null;
    }

    /**
     * Save complete examination results, vitals, diagnosis, and prescription in a single transaction
     */
    public function saveFullExamination(int $appointmentId, array $examData, array $prescriptionItems = []): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $appModel = new Appointment();
            $app = $appModel->find($appointmentId);
            if (!$app) {
                throw new Exception("Không tìm thấy cuộc hẹn.");
            }

            $patientId = (int)$app['patient_id'];
            $doctorId = (int)$app['doctor_id'];

            // 1. Vital signs JSON
            $vitalSigns = [
                'blood_pressure' => $examData['blood_pressure'] ?? '',
                'heart_rate' => (int)($examData['heart_rate'] ?? 0),
                'temperature' => (float)($examData['temperature'] ?? 0),
                'weight' => (float)($examData['weight'] ?? 0),
                'height' => (float)($examData['height'] ?? 0),
                'bmi' => (float)($examData['bmi'] ?? 0)
            ];

            // 2. Insert or update Medical Record
            $existingMr = $this->first("appointment_id = :aid", ['aid' => $appointmentId]);
            $mrData = [
                'appointment_id' => $appointmentId,
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'anamnesis' => $examData['anamnesis'] ?? '',
                'vital_signs' => json_encode($vitalSigns, JSON_UNESCAPED_UNICODE),
                'clinical_diagnosis' => $examData['clinical_diagnosis'] ?? '',
                'icd10_code' => $examData['icd10_code'] ?? '',
                'doctor_notes' => $examData['doctor_notes'] ?? '',
                're_examination_date' => !empty($examData['re_examination_date']) ? $examData['re_examination_date'] : null
            ];

            if ($existingMr) {
                $this->update($existingMr['id'], $mrData);
                $medicalRecordId = (int)$existingMr['id'];
            } else {
                $medicalRecordId = (int)$this->create($mrData);
            }

            // 3. Process Prescriptions if medicines provided
            $medicineFee = 0.00;
            if (!empty($prescriptionItems)) {
                $rxModel = new Prescription();
                $existingRx = $rxModel->first("medical_record_id = :mrid", ['mrid' => $medicalRecordId]);

                if ($existingRx) {
                    $rxId = (int)$existingRx['id'];
                    $db->prepare("DELETE FROM prescription_items WHERE prescription_id = :rxid")->execute(['rxid' => $rxId]);
                } else {
                    $rxId = (int)$rxModel->create([
                        'medical_record_id' => $medicalRecordId,
                        'appointment_id' => $appointmentId,
                        'doctor_id' => $doctorId,
                        'patient_id' => $patientId,
                        'total_amount' => 0.00,
                        'usage_instructions' => $examData['prescription_notes'] ?? ''
                    ]);
                }

                $pxiModel = new PrescriptionItem();
                $medModel = new Medicine();

                foreach ($prescriptionItems as $item) {
                    $medId = !empty($item['medicine_id']) ? (int)$item['medicine_id'] : null;
                    $qty = max(1, (int)($item['quantity'] ?? 1));
                    $unitPrice = (float)($item['unit_price'] ?? 0);
                    $subTotal = $qty * $unitPrice;
                    $medicineFee += $subTotal;

                    $pxiModel->create([
                        'prescription_id' => $rxId,
                        'medicine_id' => $medId,
                        'medicine_name' => $item['medicine_name'] ?? 'Thuốc',
                        'dosage' => $item['dosage'] ?? 'Theo chỉ dẫn',
                        'unit' => $item['unit'] ?? 'Viên',
                        'quantity' => $qty,
                        'morning' => $item['morning'] ?? '1',
                        'noon' => $item['noon'] ?? '0',
                        'afternoon' => $item['afternoon'] ?? '1',
                        'night' => $item['night'] ?? '0',
                        'instructions' => $item['instructions'] ?? '',
                        'unit_price' => $unitPrice,
                        'amount' => $subTotal
                    ]);

                    // Deduct stock if valid medicine
                    if ($medId) {
                        $medModel->rawExecute("UPDATE medicines SET stock_quantity = GREATEST(0, stock_quantity - :qty) WHERE id = :mid", [
                            'qty' => $qty,
                            'mid' => $medId
                        ]);
                    }
                }

                // Update total prescription amount
                $rxModel->update($rxId, ['total_amount' => $medicineFee]);
            }

            // 4. Create or Update Payment Invoice
            $serviceFee = 200000.00;
            if (!empty($app['service_id'])) {
                $service = (new Service())->find($app['service_id']);
                if ($service) {
                    $serviceFee = (float)$service['price'];
                }
            } else {
                $doc = (new Doctor())->find($doctorId);
                if ($doc) {
                    $serviceFee = (float)$doc['consultation_fee'];
                }
            }

            $totalAmount = $serviceFee + $medicineFee;
            $payModel = new Payment();
            $existingPayment = $payModel->first("appointment_id = :aid", ['aid' => $appointmentId]);

            if ($existingPayment) {
                $payModel->update($existingPayment['id'], [
                    'service_fee' => $serviceFee,
                    'medicine_fee' => $medicineFee,
                    'total_amount' => $totalAmount,
                    'final_amount' => $totalAmount
                ]);
            } else {
                $payModel->create([
                    'appointment_id' => $appointmentId,
                    'invoice_code' => Helper::generateInvoiceCode(),
                    'service_fee' => $serviceFee,
                    'medicine_fee' => $medicineFee,
                    'total_amount' => $totalAmount,
                    'discount' => 0.00,
                    'final_amount' => $totalAmount,
                    'payment_method' => 'cash',
                    'payment_status' => 'unpaid'
                ]);
            }

            // 5. Update Queue status to completed
            $queueModel = new ExaminationQueue();
            $queue = $queueModel->first("appointment_id = :aid", ['aid' => $appointmentId]);
            if ($queue) {
                $queueModel->update($queue['id'], [
                    'status' => 'completed',
                    'finish_time' => date('Y-m-d H:i:s')
                ]);
            }

            // 6. Complete Appointment
            $appModel->changeStatus($appointmentId, 'completed', null, 'Bác sĩ hoàn tất khám và phát hành đơn thuốc.');

            $db->commit();
            return ['success' => true, 'medical_record_id' => $medicalRecordId];
        } catch (Exception $e) {
            $db->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
