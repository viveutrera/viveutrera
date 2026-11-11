<?php
declare(strict_types=1);

namespace ViveUtrera\Media;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const TARGETS = ['site', 'element-image', 'element-audio', 'collaborator'];

final class ApiError extends \RuntimeException
{
    public int $status;
    public function __construct(int $status, string $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function fail(int $status, string $message): void
{
    throw new ApiError($status, $message);
}

function supabaseGet(array $config, string $path, string $token): array
{
    if (!function_exists('curl_init')) fail(503, 'El servidor necesita la extensión PHP cURL.');
    $request = curl_init(rtrim($config['supabase_url'], '/') . $path);
    curl_setopt_array($request, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => ['apikey: ' . $config['supabase_anon_key'],
            'Authorization: Bearer ' . $token, 'Accept: application/json'],
    ]);
    $body = curl_exec($request);
    $status = (int) curl_getinfo($request, CURLINFO_HTTP_CODE);
    curl_close($request);
    if ($body === false || $status === 0 || $status >= 500) {
        fail(503, 'No se pudieron comprobar los permisos en Supabase. Inténtalo de nuevo.');
    }
    return [$status, json_decode($body, true)];
}

function assertAdmin(array $config, array $server): void
{
    $authorization = $server['HTTP_AUTHORIZATION'] ?? $server['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([A-Za-z0-9._~-]+)$/D', $authorization, $matches)) {
        fail(401, 'La sesión ha caducado. Vuelve a iniciar sesión.');
    }
    $token = $matches[1];
    [$status, $user] = supabaseGet($config, '/auth/v1/user', $token);
    if ($status !== 200 || !is_array($user)
        || !preg_match('/^[0-9a-f-]{36}$/iD', (string) ($user['id'] ?? ''))) {
        fail(401, 'La sesión no es válida. Vuelve a iniciar sesión.');
    }
    $query = http_build_query(['user_id' => 'eq.' . $user['id'], 'select' => 'user_id', 'limit' => '1']);
    [$status, $profiles] = supabaseGet($config, '/rest/v1/admin_profiles?' . $query, $token);
    if ($status !== 200 || !is_array($profiles)
        || ($profiles[0]['user_id'] ?? null) !== $user['id']) {
        fail(403, 'Solo los administradores pueden gestionar archivos.');
    }
}

function mediaRoot(array $config): string
{
    $directory = $config['media_directory'];
    if (is_link($directory) || !is_dir($directory) || !is_writable($directory)) {
        fail(503, 'La carpeta media no existe o PHP no tiene permiso de escritura.');
    }
    $root = realpath($directory);
    if ($root === false) fail(503, 'No se puede acceder a la carpeta media.');
    return $root;
}

function mediaPath(string $root, string $key, bool $create = false): string
{
    if (strlen($key) > 1024 || strpos($key, '..') !== false
        || !preg_match('#^(site|element-image|element-audio|collaborator)/(?:[A-Za-z0-9_=@+~-]+/)*[A-Za-z0-9_][A-Za-z0-9_.,=@+~-]*\.(?:jpe?g|png|webp|gif|mp3|wav|ogg|m4a|aac|flac|webm)$#iD', $key)) {
        fail(400, 'Una de las rutas multimedia no es válida.');
    }
    $parts = explode('/', $key);
    $filename = array_pop($parts);
    $directory = $root;
    foreach ($parts as $part) {
        $directory .= DIRECTORY_SEPARATOR . $part;
        if (is_link($directory)) fail(400, 'No se permiten enlaces simbólicos.');
        if ($create && !is_dir($directory) && !@mkdir($directory, 0775) && !is_dir($directory)) {
            fail(500, 'No se pudo crear la carpeta de destino.');
        }
        if (file_exists($directory)) {
            $real = realpath($directory);
            if (!is_dir($directory) || $real === false
                || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) {
                fail(400, 'La ruta está fuera de la carpeta multimedia.');
            }
        }
    }
    $path = $directory . DIRECTORY_SEPARATOR . $filename;
    if (is_link($path) || (file_exists($path) && !is_file($path))) {
        fail(400, 'El destino no es un archivo multimedia válido.');
    }
    return $path;
}

function upload(array $config, array $files, array $post): array
{
    $file = $files['file'] ?? null;
    if (!is_array($file) || is_array($file['error'] ?? null)) fail(400, 'Falta el fichero.');
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        fail(413, 'El fichero supera el límite de subida configurado en el alojamiento.');
    }
    if ($error !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
        fail(400, 'La subida del fichero no se ha completado.');
    }
    $size = filesize($file['tmp_name']);
    if ($size === false || $size <= 0 || $size > MAX_FILE_BYTES) {
        fail(413, 'El fichero debe tener contenido y no superar 50 MiB.');
    }
    $target = $post['target'] ?? 'site';
    if (!is_string($target) || !in_array($target, TARGETS, true)) fail(400, 'Destino de subida no permitido.');
    if (!class_exists('finfo')) fail(503, 'El servidor necesita la extensión PHP Fileinfo.');
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types = [
        'image/jpeg' => ['jpg', 'image/jpeg', 'image'],
        'image/png' => ['png', 'image/png', 'image'],
        'image/webp' => ['webp', 'image/webp', 'image'],
        'image/gif' => ['gif', 'image/gif', 'image'],
        'audio/mpeg' => ['mp3', 'audio/mpeg', 'audio'],
        'audio/wav' => ['wav', 'audio/wav', 'audio'],
        'audio/x-wav' => ['wav', 'audio/wav', 'audio'],
        'audio/vnd.wave' => ['wav', 'audio/wav', 'audio'],
        'audio/ogg' => ['ogg', 'audio/ogg', 'audio'],
        'application/ogg' => ['ogg', 'audio/ogg', 'audio'],
        'audio/mp4' => ['m4a', 'audio/mp4', 'audio'],
        'video/mp4' => ['m4a', 'audio/mp4', 'audio'],
        'audio/aac' => ['aac', 'audio/aac', 'audio'],
        'audio/x-aac' => ['aac', 'audio/aac', 'audio'],
        'audio/flac' => ['flac', 'audio/flac', 'audio'],
        'audio/x-flac' => ['flac', 'audio/flac', 'audio'],
        'audio/webm' => ['webm', 'audio/webm', 'audio'],
    ];
    if (!is_string($mime) || !isset($types[$mime])) fail(415, 'Formato no permitido. Utiliza una imagen o un audio.');
    [$extension, $mime, $type] = $types[$mime];
    if (($target === 'element-audio') !== ($type === 'audio')) {
        fail(415, 'El formato del fichero no corresponde al destino seleccionado.');
    }
    if ($type === 'image' && @getimagesize($file['tmp_name']) === false) fail(415, 'La imagen no es válida.');
    $original = basename(str_replace('\\', '/', (string) ($file['name'] ?? 'archivo')));
    $name = pathinfo($original, PATHINFO_FILENAME);
    if (function_exists('iconv')) $name = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: 'archivo';
    $name = trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-');
    $name = substr($name ?: 'archivo', 0, 80);
    $key = $target . '/' . gmdate('Y/m') . '/' . bin2hex(random_bytes(16)) . '-' . $name . '.' . $extension;
    $path = mediaPath(mediaRoot($config), $key, true);
    if (file_exists($path) || !move_uploaded_file($file['tmp_name'], $path)) fail(500, 'No se pudo guardar el fichero.');
    @chmod($path, 0644);
    return ['publicUrl' => rtrim($config['public_media_url'], '/') . '/' . $key, 'asset' => [
        'object_key' => $key, 'media_type' => $target === 'collaborator' ? 'logo' : $type,
        'mime_type' => $mime, 'original_name' => $original, 'file_size' => $size,
    ]];
}

function deleteFiles(array $config, string $body): array
{
    if (strlen($body) > 128 * 1024) fail(413, 'La petición es demasiado grande.');
    $payload = json_decode($body, true);
    $keys = is_array($payload) ? ($payload['objectKeys'] ?? null) : null;
    if (!is_array($keys) || count($keys) === 0 || count($keys) > 100) {
        fail(400, 'Indica entre 1 y 100 archivos para borrar.');
    }
    $root = mediaRoot($config);
    $paths = [];
    // Validate the whole batch before removing any file.
    foreach ($keys as $key) {
        if (!is_string($key)) fail(400, 'Una de las rutas no es válida.');
        $paths[$key] = mediaPath($root, $key);
    }
    foreach ($paths as $path) {
        if (file_exists($path) && !@unlink($path)) fail(500, 'No se pudo borrar uno de los archivos.');
    }
    return ['deleted' => array_keys($paths)];
}

function dispatch(array $config, array $server, array $query, array $files, array $post, string $body): array
{
    $origin = $server['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && !in_array($origin, $config['allowed_origins'], true)) fail(403, 'Origen no permitido.');
    $method = $server['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') return [204, null];
    $action = $query['action'] ?? '';
    if ($action === 'health' && $method === 'GET') {
        $ready = PHP_VERSION_ID >= 80100 && function_exists('curl_init') && class_exists('finfo')
            && is_dir($config['media_directory']) && is_writable($config['media_directory'])
            && !is_link($config['media_directory']);
        return [$ready ? 200 : 503, ['ok' => $ready, 'storage' => 'SW Hosting']];
    }
    if ($method !== 'POST') fail(405, 'Método no permitido.');
    if (!in_array($action, ['upload', 'delete'], true)) fail(404, 'Operación no encontrada.');
    assertAdmin($config, $server);
    if ($action === 'upload') {
        if ((int) ($server['CONTENT_LENGTH'] ?? 0) > MAX_FILE_BYTES + 1024 * 1024
            || (empty($files) && (int) ($server['CONTENT_LENGTH'] ?? 0) > 0)) {
            fail(413, 'La petición supera el límite de subida del alojamiento o no contiene un fichero válido.');
        }
        return [201, upload($config, $files, $post)];
    }
    return [200, deleteFiles($config, $body)];
}
