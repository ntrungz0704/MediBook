<?php
namespace App\Models;

use App\Core\Model;

class Service extends Model {
    protected string $table = 'services';

    public function getBySpecialty(int $specialtyId): array {
        return $this->where("specialty_id = :sid AND status = 'active'", ['sid' => $specialtyId], 'price ASC');
    }

    public function getAllWithSpecialty(): array {
        $sql = "SELECT s.*, sp.name as specialty_name
                FROM services s
                JOIN specialties sp ON s.specialty_id = sp.id
                ORDER BY s.specialty_id ASC, s.id ASC";
        return $this->rawQuery($sql);
    }
}
