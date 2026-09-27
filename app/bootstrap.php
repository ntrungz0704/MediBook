<?php
/**
 * MediBook Application Bootstrap
 */

// Load Configuration
$configFile = dirname(__DIR__) . '/config/config.php';
if (!file_exists($configFile)) {
    $exampleConfig = dirname(__DIR__) . '/config/config.example.php';
    if (file_exists($exampleConfig)) {
        copy($exampleConfig, $configFile);
    } else {
        die("Tệp cấu hình không tồn tại. Vui lòng tạo config/config.php.");
    }
}
require_once $configFile;

// Set Timezone
date_default_timezone_set(defined('APP_TIMEZONE') ? APP_TIMEZONE : 'Asia/Ho_Chi_Minh');

// Error Reporting
if (defined('APP_ENV') && APP_ENV === 'development') {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// PSR-4 Autoloader for 'App\' namespace
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

// Start Session
\App\Core\Session::start();
