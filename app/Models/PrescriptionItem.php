<?php
namespace App\Models;

use App\Core\Model;

class PrescriptionItem extends Model {
    protected string $table = 'prescription_items';

    public function getItemsByPrescription(int $prescriptionId): array {
        return $this->where("prescription_id = :pid", ['pid' => $prescriptionId], "id ASC");
    }
}
