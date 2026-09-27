<?php
namespace App\Models;

use App\Core\Model;

class Specialty extends Model {
    protected string $table = 'specialties';

    public function getActiveSpecialties(): array {
        $sql = "SELECT s.*, COUNT(DISTINCT ds.doctor_id) as doctor_count
                FROM specialties s
                LEFT JOIN doctor_specialties ds ON s.id = ds.specialty_id
                WHERE s.status = 'active'
                GROUP BY s.id
                ORDER BY s.id ASC";
        return $this->rawQuery($sql);
    }

    public function getBySlug(string $slug): ?array {
        return $this->first("slug = :slug AND status = 'active'", ['slug' => $slug]);
    }
}
