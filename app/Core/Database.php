<?php
namespace App\Core;

use PDO;
use PDOException;
use Exception;

class Database {
    private static ?PDO $instance = null;

    private function __construct() {}
    private function __clone() {}

    /**
     * Get singleton PDO connection
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $driver = defined('DB_DRIVER') ? DB_DRIVER : 'mysql';

            if ($driver === 'sqlite') {
                $dbPath = defined('DB_SQLITE_PATH') ? DB_SQLITE_PATH : ROOT_PATH . '/database/medibook.sqlite';
                $dir = dirname($dbPath);
                if (!is_dir($dir)) {
                    mkdir($dir, 0777, true);
                }
                self::$instance = new PDO("sqlite:" . $dbPath);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$instance->exec("PRAGMA foreign_keys = ON;");
            } else {
                $host = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
                $port = defined('DB_PORT') ? DB_PORT : '3306';
                $dbname = defined('DB_NAME') ? DB_NAME : 'medibook_db';
                $user = defined('DB_USER') ? DB_USER : 'root';
                $pass = defined('DB_PASS') ? DB_PASS : '';
                $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

                $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

                try {
                    self::$instance = new PDO($dsn, $user, $pass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE utf8mb4_unicode_ci"
                    ]);
                } catch (PDOException $e) {
                    // In development, if SQLite path exists and MySQL is unavailable, fallback gracefully
                    if (defined('APP_ENV') && APP_ENV === 'development' && defined('DB_SQLITE_PATH') && file_exists(DB_SQLITE_PATH)) {
                        self::$instance = new PDO("sqlite:" . DB_SQLITE_PATH);
                        self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                        self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                        self::$instance->exec("PRAGMA foreign_keys = ON;");
                    } else {
                        throw new Exception("Lỗi kết nối cơ sở dữ liệu: " . $e->getMessage() . ". Vui lòng kiểm tra config/config.php và đảm bảo MySQL đang chạy.");
                    }
                }
            }
        }

        return self::$instance;
    }

    /**
     * Set a custom PDO instance (useful for unit testing or in-memory sqlite)
     */
    public static function setConnection(?PDO $pdo): void {
        self::$instance = $pdo;
    }

    public static function beginTransaction(): bool {
        return self::getConnection()->beginTransaction();
    }

    public static function commit(): bool {
        return self::getConnection()->commit();
    }

    public static function rollBack(): bool {
        return self::getConnection()->rollBack();
    }

    public static function lastInsertId(): string {
        return self::getConnection()->lastInsertId();
    }
}
