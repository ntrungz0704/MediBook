<?php
namespace App\Core;

use PDO;
use Exception;

abstract class Model {
    protected PDO $db;
    protected string $table = '';
    protected string $primaryKey = 'id';

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Get all records
     */
    public function all(string $orderBy = 'id DESC', ?int $limit = null, ?int $offset = null): array {
        $sql = "SELECT * FROM `{$this->table}` ORDER BY {$orderBy}";
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit;
            if ($offset !== null) {
                $sql .= " OFFSET " . (int)$offset;
            }
        }
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Find single record by ID
     */
    public function find($id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM `{$this->table}` WHERE `{$this->primaryKey}` = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Find single record by any column
     */
    public function findBy(string $field, $value): ?array {
        $stmt = $this->db->prepare("SELECT * FROM `{$this->table}` WHERE `{$field}` = :val LIMIT 1");
        $stmt->execute(['val' => $value]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Query records with WHERE condition
     */
    public function where(string $condition, array $params = [], string $orderBy = 'id DESC', ?int $limit = null, ?int $offset = null): array {
        $sql = "SELECT * FROM `{$this->table}` WHERE {$condition} ORDER BY {$orderBy}";
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit;
            if ($offset !== null) {
                $sql .= " OFFSET " . (int)$offset;
            }
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Query first record matching condition
     */
    public function first(string $condition = '1=1', array $params = [], string $orderBy = 'id ASC'): ?array {
        $sql = "SELECT * FROM `{$this->table}` WHERE {$condition} ORDER BY {$orderBy} LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Count records matching condition
     */
    public function count(string $condition = '1=1', array $params = []): int {
        $sql = "SELECT COUNT(*) as total FROM `{$this->table}` WHERE {$condition}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return (int)($row['total'] ?? 0);
    }

    /**
     * Create new record
     */
    public function create(array $data): string {
        $columns = array_keys($data);
        $fields = implode('`, `', $columns);
        $placeholders = ':' . implode(', :', $columns);

        $sql = "INSERT INTO `{$this->table}` (`{$fields}`) VALUES ({$placeholders})";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return $this->db->lastInsertId();
    }

    /**
     * Update record by ID
     */
    public function update($id, array $data): bool {
        $setClauses = [];
        foreach ($data as $col => $val) {
            $setClauses[] = "`{$col}` = :set_{$col}";
        }
        $setSql = implode(', ', $setClauses);

        $sql = "UPDATE `{$this->table}` SET {$setSql} WHERE `{$this->primaryKey}` = :pk_id";
        $stmt = $this->db->prepare($sql);

        $params = [':pk_id' => $id];
        foreach ($data as $col => $val) {
            $params[":set_{$col}"] = $val;
        }

        return $stmt->execute($params);
    }

    /**
     * Delete record by ID
     */
    public function delete($id): bool {
        $stmt = $this->db->prepare("DELETE FROM `{$this->table}` WHERE `{$this->primaryKey}` = :id");
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Custom raw query with parameters
     */
    public function rawQuery(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Custom raw statement execute
     */
    public function rawExecute(string $sql, array $params = []): bool {
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
}
