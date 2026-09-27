<?php
namespace App\Models;

use App\Core\Model;

class DoctorSpecialty extends Model {
    protected string $table = 'doctor_specialties';

    public function syncDoctorSpecialties(int $doctorId, array $specialtyIds, int $primaryId = 0): void {
        $this->rawExecute("DELETE FROM `{$this->table}` WHERE doctor_id = :did", ['did' => $doctorId]);

        foreach ($specialtyIds as $sid) {
            $sid = (int)$sid;
            if ($sid > 0) {
                $isPrimary = ($sid === $primaryId) ? 1 : 0;
                $this->create([
                    'doctor_id' => $doctorId,
                    'specialty_id' => $sid,
                    'is_primary' => $isPrimary
                ]);
            }
        }
    }
}
