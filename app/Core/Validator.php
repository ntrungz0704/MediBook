<?php
namespace App\Core;

class Validator {
    private array $data;
    private array $errors = [];

    public function __construct(array $data) {
        $this->data = $data;
    }

    public static function make(array $data, array $rules): self {
        $validator = new self($data);
        $validator->validate($rules);
        return $validator;
    }

    public function validate(array $rules): void {
        foreach ($rules as $field => $ruleString) {
            $ruleList = explode('|', $ruleString);
            $value = $this->data[$field] ?? null;

            foreach ($ruleList as $rule) {
                $params = [];
                if (str_contains($rule, ':')) {
                    [$ruleName, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                } else {
                    $ruleName = $rule;
                }

                $this->applyRule($field, $ruleName, $value, $params);
            }
        }
    }

    private function applyRule(string $field, string $rule, $value, array $params): void {
        $label = $this->getFieldLabel($field);

        switch ($rule) {
            case 'required':
                if ($value === null || trim((string)$value) === '') {
                    $this->addError($field, "Vui lòng nhập {$label}.");
                }
                break;

            case 'email':
                if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($field, "{$label} không đúng định dạng email hợp lệ.");
                }
                break;

            case 'phone':
                if (!empty($value) && !preg_match('/^[0-9+() -]{9,15}$/', (string)$value)) {
                    $this->addError($field, "{$label} không đúng định dạng số điện thoại hợp lệ.");
                }
                break;

            case 'min':
                $min = (int)($params[0] ?? 0);
                if (!empty($value) && mb_strlen((string)$value) < $min) {
                    $this->addError($field, "{$label} phải chứa ít nhất {$min} ký tự.");
                }
                break;

            case 'max':
                $max = (int)($params[0] ?? 255);
                if (!empty($value) && mb_strlen((string)$value) > $max) {
                    $this->addError($field, "{$label} không được vượt quá {$max} ký tự.");
                }
                break;

            case 'numeric':
                if (!empty($value) && !is_numeric($value)) {
                    $this->addError($field, "{$label} phải là một số hợp lệ.");
                }
                break;

            case 'date':
                if (!empty($value) && !strtotime($value)) {
                    $this->addError($field, "{$label} không phải là ngày hợp lệ (định dạng YYYY-MM-DD).");
                }
                break;

            case 'in':
                if (!empty($value) && !in_array($value, $params, true)) {
                    $this->addError($field, "{$label} đã chọn không hợp lệ.");
                }
                break;

            case 'confirmed':
                $confirmField = $field . '_confirmation';
                $confirmVal = $this->data[$confirmField] ?? null;
                if ($value !== $confirmVal) {
                    $this->addError($field, "Xác nhận {$label} không khớp.");
                }
                break;

            case 'unique':
                if (!empty($value) && count($params) >= 2) {
                    $table = $params[0];
                    $column = $params[1];
                    $exceptId = $params[2] ?? null;

                    $db = Database::getConnection();
                    $sql = "SELECT COUNT(*) as count FROM `{$table}` WHERE `{$column}` = :val";
                    $binds = ['val' => $value];
                    if ($exceptId !== null) {
                        $sql .= " AND `id` != :except_id";
                        $binds['except_id'] = $exceptId;
                    }
                    $stmt = $db->prepare($sql);
                    $stmt->execute($binds);
                    $res = $stmt->fetch();
                    if (($res['count'] ?? 0) > 0) {
                        $this->addError($field, "{$label} này đã được sử dụng trong hệ thống.");
                    }
                }
                break;
        }
    }

    private function addError(string $field, string $message): void {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function passes(): bool {
        return empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function has(string $field): bool {
        return !empty($this->errors[$field]);
    }

    public function hasError(string $field): bool {
        return $this->has($field);
    }

    public function first(string $field): ?string {
        return $this->errors[$field][0] ?? null;
    }

    private function getFieldLabel(string $field): string {
        $labels = [
            'name' => 'họ và tên',
            'email' => 'địa chỉ email',
            'password' => 'mật khẩu',
            'phone' => 'số điện thoại',
            'dob' => 'ngày sinh',
            'gender' => 'giới tính',
            'specialty_id' => 'chuyên khoa',
            'doctor_id' => 'bác sĩ',
            'service_id' => 'dịch vụ khám',
            'appointment_date' => 'ngày khám',
            'start_time' => 'khung giờ khám',
            'symptoms' => 'lý do khám / triệu chứng',
            'address' => 'địa chỉ',
            'role' => 'vai trò'
        ];
        return $labels[$field] ?? $field;
    }
}
