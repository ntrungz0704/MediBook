<?php
namespace App\Models;

use App\Core\Model;

class Review extends Model {
    protected string $table = 'reviews';

    public function getDoctorReviews(int $doctorId, int $limit = 10): array {
        $sql = "SELECT r.*, 
                       CASE WHEN r.is_anonymous = 1 THEN 'Bệnh nhân ẩn danh' ELSE u.name END as reviewer_name,
                       u.avatar as reviewer_avatar
                FROM reviews r
                JOIN patients p ON r.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE r.doctor_id = :did
                ORDER BY r.id DESC LIMIT " . (int)$limit;
        return $this->rawQuery($sql, ['did' => $doctorId]);
    }

    public function addDoctorReview(int $appointmentId, int $patientId, int $doctorId, int $rating, string $comment, bool $isAnonymous = false): bool {
        $existing = $this->first("appointment_id = :aid", ['aid' => $appointmentId]);
        if ($existing) {
            return false;
        }

        $rating = max(1, min(5, $rating));
        $this->create([
            'appointment_id' => $appointmentId,
            'patient_id' => $patientId,
            'doctor_id' => $doctorId,
            'rating' => $rating,
            'comment' => $comment,
            'is_anonymous' => $isAnonymous ? 1 : 0
        ]);

        // Re-calculate doctor average rating and rating count
        $avgSql = "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE doctor_id = :did";
        $stats = $this->rawQuery($avgSql, ['did' => $doctorId]);
        if (!empty($stats[0])) {
            $doctorModel = new Doctor();
            $doctorModel->update($doctorId, [
                'rating' => round((float)$stats[0]['avg_rating'], 2),
                'rating_count' => (int)$stats[0]['total_reviews']
            ]);
        }

        return true;
    }
}
