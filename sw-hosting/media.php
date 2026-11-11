<?php
declare(strict_types=1);

require __DIR__ . '/media-service.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin');
ini_set('display_errors', '0');

try {
    $config = require __DIR__ . '/media-config.php';
    if (!is_array($config) || empty($config['supabase_url']) || empty($config['supabase_anon_key'])) {
        throw new \ViveUtrera\Media\ApiError(503, 'Falta configurar Supabase para la API.');
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $config['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
    }
    // Apache/FastCGI may expose Authorization only through getallheaders().
    if (empty($_SERVER['HTTP_AUTHORIZATION']) && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) $_SERVER['HTTP_AUTHORIZATION'] = $value;
        }
    }
    $body = '';
    if (($_GET['action'] ?? '') === 'delete') {
        $body = file_get_contents('php://input', false, null, 0, 128 * 1024 + 1) ?: '';
    }
    [$status, $payload] = \ViveUtrera\Media\dispatch($config, $_SERVER, $_GET, $_FILES, $_POST, $body);
} catch (\ViveUtrera\Media\ApiError $error) {
    $status = $error->status;
    $payload = ['error' => $error->getMessage()];
} catch (\Throwable $error) {
    // Do not send filesystem paths, tokens or backend responses to the browser.
    error_log('ViveUtrera media API: ' . get_class($error));
    $status = 500;
    $payload = ['error' => 'No se pudo completar la operación multimedia.'];
}
http_response_code($status);
if ($payload !== null) echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
