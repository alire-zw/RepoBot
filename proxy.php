<?php
/**
 * پروکسی دوطرفه برای ربات تلگرام (هاست خارج از ایران)
 *
 * ۱) وب‌هوک ورودی: تلگرام به این آدرس POST می‌زند → همین فایل بدنه را به سرور ربات (ایران) فوروارد می‌کند.
 * ۲) API خروجی: ربات با apiRoot به این آدرس درخواست می‌زند (/botTOKEN/method) → به api.telegram.org فوروارد می‌شود.
 *
 * در هاست خارجی: این فایل را آپلود کنید و آدرس وب‌هوک تلگرام را به همین دامنه (مثلاً https://your-domain.com/proxy.php) تنظیم کنید.
 * آدرس سرور ربات (ایران) را در BOT_BACKEND_WEBHOOK_URL قرار دهید.
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Bot-Token, User-Agent');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/** آدرس کامل وب‌هوک ربات روی سرور ایران؛ مثلاً http://IP:3000/webhook یا https://bot.yourdomain.ir/webhook */
$BOT_BACKEND_WEBHOOK_URL = getenv('BOT_BACKEND_WEBHOOK_URL') ?: 'http://YOUR_IRAN_SERVER_IP:3000/webhook';

function logMessage($message) {
    @file_put_contents(__DIR__ . '/proxy_log.txt', date('Y-m-d H:i:s') . ' - ' . $message . "\n", FILE_APPEND);
}

$rawInput = file_get_contents('php://input');
$headers = getallheaders();
$botTokenHeader = $headers['X-Bot-Token'] ?? $headers['x-bot-token'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

// مسیر بعد از نام اسکریپت؛ مثلاً /bot123:ABC/sendMessage
$pathAfterScript = '';
if (isset($_SERVER['PATH_INFO'])) {
    $pathAfterScript = $_SERVER['PATH_INFO'];
} else {
    $uriPath = parse_url($requestUri, PHP_URL_PATH);
    if ($uriPath !== false && $scriptName !== '' && strpos($uriPath, $scriptName) === 0) {
        $pathAfterScript = substr($uriPath, strlen($scriptName));
        if ($pathAfterScript === false) {
            $pathAfterScript = '';
        }
    }
}
$pathAfterScript = '/' . trim($pathAfterScript, '/');

// تشخیص وب‌هوک ورودی: POST بدون X-Bot-Token و بدنهٔ JSON شبیه update تلگرام (دارای update_id)
$isWebhook = (
    $method === 'POST' &&
    $botTokenHeader === '' &&
    $rawInput !== ''
);
if ($isWebhook) {
    $decoded = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && isset($decoded['update_id'])) {
        $isWebhook = true;
    } else {
        $isWebhook = false;
    }
}

if ($isWebhook) {
    // فوروارد به سرور ربات (ایران)
    logMessage('Webhook forward: forwarding update to backend');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $BOT_BACKEND_WEBHOOK_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawInput);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($response === false) {
        logMessage('Webhook forward error: ' . curl_error($ch));
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'Backend unreachable']);
    } else {
        http_response_code((int) $httpCode);
        header('Content-Type: application/json');
        echo $response;
    }
    curl_close($ch);
    exit;
}

// تشخیص درخواست API: از مسیر /botTOKEN/method یا از هدر X-Bot-Token + endpoint
$botToken = '';
$apiMethod = '';

if (preg_match('#^/bot([^/]+)/(.+)$#', $pathAfterScript, $m)) {
    $botToken = $m[1];
    $apiMethod = $m[2];
    logMessage("API from path: method={$apiMethod}");
} elseif ($botTokenHeader !== '' && isset($_GET['endpoint'])) {
    $botToken = $botTokenHeader;
    $apiMethod = $_GET['endpoint'];
    logMessage("API from header/query: method={$apiMethod}");
}

if ($botToken === '' || $apiMethod === '') {
    logMessage('Reject: not webhook and no bot token/method');
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Missing bot token or method (use /botTOKEN/method or X-Bot-Token + endpoint)']);
    exit;
}

// فوروارد به API تلگرام
$telegramUrl = "https://api.telegram.org/bot{$botToken}/{$apiMethod}";
logMessage("API forward: {$telegramUrl}");

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $telegramUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

if ($method === 'POST') {
    $body = $rawInput !== '' ? $rawInput : '{}';
    $decoded = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $decoded = [];
    }
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($decoded));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
} else {
    // GET با همان query string
    $query = parse_url($requestUri, PHP_URL_QUERY);
    if ($query !== false && $query !== null) {
        curl_setopt($ch, CURLOPT_URL, $telegramUrl . '?' . $query);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($response === false) {
    logMessage('API forward error: ' . curl_error($ch));
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Telegram API unreachable']);
} else {
    http_response_code((int) $httpCode);
    header('Content-Type: application/json');
    echo $response;
}
curl_close($ch);
