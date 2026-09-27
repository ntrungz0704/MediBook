<?php
namespace App\Models;

use App\Core\Model;

class Prescription extends Model {
    protected string $table = 'prescriptions';

    public function getFullPrescriptionByAppointment(int $appointmentId): ?array {
        $prescription = $this->first("appointment_id = :aid", ['aid' => $appointmentId]);
        if (!$prescription) {
            return null;
        }

        $itemModel = new PrescriptionItem();
        $prescription['items'] = $itemModel->getItemsByPrescription((int)$prescription['id']);

        return $prescription;
    }
}
