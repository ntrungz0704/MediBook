<?php
namespace App\Core;

class Helper {
    /**
     * Escape HTML output
     */
    public static function e(?string $string): string {
        return htmlspecialchars($string ?? '', ENT_QUOTES, 'UTF-8');
    }

    /**
     * Format Vietnamese Currency (VND)
     */
    public static function formatCurrency(float $amount): string {
        return number_format($amount, 0, ',', '.') . ' ₫';
    }

    /**
     * Format Date
     */
    public static function formatDate(?string $date, string $format = 'd/m/Y'): string {
        if (!$date) return '-';
        $time = strtotime($date);
        return $time ? date($format, $time) : $date;
    }

    /**
     * Format Date with Vietnamese Day of Week (e.g. 'Thứ 6, 25/04/2025')
     */
    public static function formatDateWithDayVi(?string $date): string {
        if (!$date) return '-';
        $time = strtotime($date);
        if (!$time) return $date;

        $days = [
            'Sunday' => 'Chủ nhật',
            'Monday' => 'Thứ 2',
            'Tuesday' => 'Thứ 3',
            'Wednesday' => 'Thứ 4',
            'Thursday' => 'Thứ 5',
            'Friday' => 'Thứ 6',
            'Saturday' => 'Thứ 7'
        ];

        $englishDay = date('l', $time);
        $dayVi = $days[$englishDay] ?? '';

        return $dayVi . ', ' . date('d/m/Y', $time);
    }

    /**
     * Format Time (e.g. '09:00 - 09:30')
     */
    public static function formatTimeSlot(string $start, string $end): string {
        return substr($start, 0, 5) . ' - ' . substr($end, 0, 5);
    }

    /**
     * Generate Booking Code (e.g. MB250425-0012)
     */
    public static function generateBookingCode(): string {
        $prefix = 'MB';
        $datePart = date('ymd');
        $random = sprintf('%04d', mt_rand(1, 9999));
        return "{$prefix}{$datePart}-{$random}";
    }

    /**
     * Generate Invoice Code (e.g. HD250425-0012)
     */
    public static function generateInvoiceCode(): string {
        $prefix = 'HD';
        $datePart = date('ymd');
        $random = sprintf('%04d', mt_rand(1, 9999));
        return "{$prefix}{$datePart}-{$random}";
    }

    /**
     * Get Appointment Status Badge HTML & Text
     */
    public static function getAppointmentStatusBadge(string $status): string {
        $map = [
            'pending' => [
                'text' => 'Chờ xác nhận',
                'class' => 'badge-warning',
                'icon' => 'clock'
            ],
            'confirmed' => [
                'text' => 'Đã xác nhận',
                'class' => 'badge-success',
                'icon' => 'check-circle'
            ],
            'checked_in' => [
                'text' => 'Đã tiếp đón',
                'class' => 'badge-info',
                'icon' => 'hospital-user'
            ],
            'in_consultation' => [
                'text' => 'Đang khám',
                'class' => 'badge-primary',
                'icon' => 'stethoscope'
            ],
            'completed' => [
                'text' => 'Đã hoàn thành',
                'class' => 'badge-completed',
                'icon' => 'check-double'
            ],
            'cancelled' => [
                'text' => 'Đã hủy',
                'class' => 'badge-danger',
                'icon' => 'times-circle'
            ],
            'no_show' => [
                'text' => 'Không đến',
                'class' => 'badge-secondary',
                'icon' => 'user-slash'
            ]
        ];

        $info = $map[$status] ?? ['text' => $status, 'class' => 'badge-secondary', 'icon' => 'info-circle'];
        return '<span class="badge ' . $info['class'] . '">' . htmlspecialchars($info['text']) . '</span>';
    }

    /**
     * Get Payment Status Badge
     */
    public static function getPaymentStatusBadge(string $status): string {
        $map = [
            'unpaid' => ['text' => 'Chưa thanh toán', 'class' => 'badge-warning'],
            'paid' => ['text' => 'Đã thanh toán', 'class' => 'badge-success'],
            'refunded' => ['text' => 'Đã hoàn tiền', 'class' => 'badge-danger']
        ];
        $info = $map[$status] ?? ['text' => $status, 'class' => 'badge-secondary'];
        return '<span class="badge ' . $info['class'] . '">' . htmlspecialchars($info['text']) . '</span>';
    }

    /**
     * Get Day of week text from number (0: CN, 1: T2... 6: T7)
     */
    public static function getDayOfWeekName(int $dow): string {
        $names = [
            0 => 'Chủ nhật',
            1 => 'Thứ hai',
            2 => 'Thứ ba',
            3 => 'Thứ tư',
            4 => 'Thứ năm',
            5 => 'Thứ sáu',
            6 => 'Thứ bảy'
        ];
        return $names[$dow] ?? "Thứ {$dow}";
    }

    /**
     * Generate URL
     */
    public static function url(string $path = ''): string {
        $base = defined('APP_URL') ? APP_URL : '';
        $path = '/' . ltrim($path, '/');
        return $base . $path;
    }

    /**
     * Generate Asset URL
     */
    public static function asset(string $path = ''): string {
        return self::url('assets/' . ltrim($path, '/'));
    }

    /**
     * Convert Vietnamese string to URL-friendly slug
     */
    public static function slugify(string $text): string {
        $trans = [
            'à'=>'a','á'=>'a','ả'=>'a','ã'=>'a','ạ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ẳ'=>'a','ẵ'=>'a','ặ'=>'a',
            'â'=>'a','ầ'=>'a','ấ'=>'a','ẩ'=>'a','ẫ'=>'a','ậ'=>'a','đ'=>'d','è'=>'e','é'=>'e','ẻ'=>'e','ẽ'=>'e',
            'ẹ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ể'=>'e','ễ'=>'e','ệ'=>'e','ì'=>'i','í'=>'i','ỉ'=>'i','ĩ'=>'i',
            'ị'=>'i','ò'=>'o','ó'=>'o','ỏ'=>'o','õ'=>'o','ọ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ổ'=>'o','ỗ'=>'o',
            'ộ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ở'=>'o','ỡ'=>'o','ợ'=>'o','ù'=>'u','ú'=>'u','ủ'=>'u','ũ'=>'u',
            'ụ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ử'=>'u','ữ'=>'u','ự'=>'u','ỳ'=>'y','ý'=>'y','ỷ'=>'y','ỹ'=>'y',
            'ỵ'=>'y'
        ];
        $text = mb_strtolower($text, 'UTF-8');
        $text = strtr($text, $trans);
        $text = preg_replace('/[^a-z0-9]+/i', '-', $text);
        return trim($text, '-');
    }

    /**
     * Get flash or old input value
     */
    public static function old(string $key, $default = '') {
        $old = Session::get('_old_input', []);
        return $old[$key] ?? $default;
    }
}
