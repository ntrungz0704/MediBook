<?php
namespace App\Models;

use App\Core\Model;

class Medicine extends Model {
    protected string $table = 'medicines';

    public function getActiveMedicines(): array {
        return $this->where("status = 'active' AND stock_quantity > 0", [], "name ASC");
    }

    public function searchMedicines(string $term): array {
        $term = "%{$term}%";
        return $this->rawQuery(
            "SELECT * FROM medicines WHERE status = 'active' AND (name LIKE :term1 OR code LIKE :term2) ORDER BY name ASC LIMIT 20",
            ['term1' => $term, 'term2' => $term]
        );
    }
}
