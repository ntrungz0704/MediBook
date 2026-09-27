<?php
namespace App\Controllers\Doctor;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\Patient;

class ExaminationController extends Controller {
    public function examine(int $appointmentId): void {
        Auth::requireRole('doctor');

        $appModel = new Appointment();
        $appointment = $appModel->getDetailsById($appointmentId);

        if (!$appointment) {
            Response::error(404, 'Không tìm thấy thông tin lịch khám.');
            return;
        }

        // Get past medical records for this patient
        $mrModel = new MedicalRecord();
        $pastRecords = $mrModel->where("patient_id = :pid AND appointment_id != :aid", [
            'pid' => $appointment['patient_id'],
            'aid' => $appointmentId
        ], 'id DESC', 5);

        // Current medical record if already filled partially
        $currentRecord = $mrModel->first("appointment_id = :aid", ['aid' => $appointmentId]);
        $currentPrescription = null;
        if ($currentRecord) {
            $currentPrescription = (new Prescription())->getFullPrescriptionByAppointment($appointmentId);
        }

        // Active medicines for selection
        $medModel = new Medicine();
        $medicines = $medModel->getActiveMedicines();

        $this->view('doctor/examine', [
            'pageTitle' => 'Khám bệnh - ' . $appointment['patient_name'],
            'app' => $appointment,
            'pastRecords' => $pastRecords,
            'currentRecord' => $currentRecord,
            'currentPrescription' => $currentPrescription,
            'medicines' => $medicines
        ], 'layouts/doctor');
    }

    public function store(int $appointmentId): void {
        Auth::requireRole('doctor');
        $this->validateCsrf();

        $validator = $this->validate([
            'clinical_diagnosis' => 'required|min:3'
        ]);

        if ($validator->fails()) {
            $this->redirect('/doctor/examine/' . $appointmentId);
            return;
        }

        $examData = [
            'blood_pressure' => $this->request->input('blood_pressure'),
            'heart_rate' => $this->request->input('heart_rate'),
            'temperature' => $this->request->input('temperature'),
            'weight' => $this->request->input('weight'),
            'height' => $this->request->input('height'),
            'bmi' => $this->request->input('bmi'),
            'anamnesis' => $this->request->input('anamnesis'),
            'clinical_diagnosis' => $this->request->input('clinical_diagnosis'),
            'icd10_code' => $this->request->input('icd10_code'),
            'doctor_notes' => $this->request->input('doctor_notes'),
            're_examination_date' => $this->request->input('re_examination_date'),
            'prescription_notes' => $this->request->input('prescription_notes')
        ];

        // Parse dynamic medicines from table
        $prescriptionItems = [];
        $medNames = (array)$this->request->input('med_name', []);
        $medIds = (array)$this->request->input('med_id', []);
        $medDosages = (array)$this->request->input('med_dosage', []);
        $medUnits = (array)$this->request->input('med_unit', []);
        $medQtys = (array)$this->request->input('med_quantity', []);
        $medMornings = (array)$this->request->input('med_morning', []);
        $medNoons = (array)$this->request->input('med_noon', []);
        $medAfternoons = (array)$this->request->input('med_afternoon', []);
        $medNights = (array)$this->request->input('med_night', []);
        $medInstructions = (array)$this->request->input('med_instructions', []);
        $medPrices = (array)$this->request->input('med_price', []);

        foreach ($medNames as $i => $name) {
            if (!empty(trim($name))) {
                $prescriptionItems[] = [
                    'medicine_id' => !empty($medIds[$i]) ? (int)$medIds[$i] : null,
                    'medicine_name' => trim($name),
                    'dosage' => $medDosages[$i] ?? '',
                    'unit' => $medUnits[$i] ?? 'Viên',
                    'quantity' => (int)($medQtys[$i] ?? 1),
                    'morning' => $medMornings[$i] ?? '1',
                    'noon' => $medNoons[$i] ?? '0',
                    'afternoon' => $medAfternoons[$i] ?? '1',
                    'night' => $medNights[$i] ?? '0',
                    'instructions' => $medInstructions[$i] ?? '',
                    'unit_price' => (float)($medPrices[$i] ?? 0)
                ];
            }
        }

        $mrModel = new MedicalRecord();
        $result = $mrModel->saveFullExamination($appointmentId, $examData, $prescriptionItems);

        if (!$result['success']) {
            Session::flash('error', $result['error'] ?? 'Có lỗi xảy ra khi lưu kết quả khám.');
            $this->redirect('/doctor/examine/' . $appointmentId);
            return;
        }

        $this->logActivity('COMPLETE_EXAM', 'Appointment', $appointmentId, 'Bác sĩ hoàn tất khám và kê toa');
        Session::flash('success', 'Đã lưu kết quả khám bệnh và đơn thuốc thành công. Bệnh nhân đã được chuyển sang quầy thu ngân!');
        $this->redirect('/doctor/queue');
    }
}
