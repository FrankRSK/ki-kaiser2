<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['endpoint'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Ungültige Anfrage']);
  exit;
}

$endpoint = $input['endpoint'];

switch ($endpoint) {
  case 'ollama':
    handleOllama($input);
    break;

  case 'openai':
    handleOpenAI($input);
    break;

  case 'anthropic':
    handleAnthropic($input);
    break;

  case 'deepseek':
    handleDeepSeek($input);
    break;

  case 'tts':
    handleTTS($input);
    break;

  case 'tts_voices':
    handleTTSVoices();
    break;

  case 'ollama_models':
    handleOllamaModels();
    break;

  default:
    http_response_code(400);
    echo json_encode(['error' => 'Unbekannter Endpunkt']);
    break;
}

function handleOpenAI($input) {
  $url = 'https://api.openai.com/v1/chat/completions';
  $apiKey = $input['apiKey'] ?? '';
  $model = $input['model'] ?? 'gpt-3.5-turbo';

  if (empty($apiKey)) {
    http_response_code(400);
    echo json_encode(['error' => 'API-Key erforderlich']);
    return;
  }

  $postData = json_encode([
    'model' => $model,
    'messages' => [
      ['role' => 'system', 'content' => $input['system'] ?? ''],
      ['role' => 'user', 'content' => $input['prompt'] ?? '']
    ],
    'temperature' => 0.7
  ]);

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
  ]);
  curl_setopt($ch, CURLOPT_TIMEOUT, 60);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  http_response_code($httpCode);
  echo $response;
}

function handleAnthropic($input) {
  $url = 'https://api.anthropic.com/v1/messages';
  $apiKey = $input['apiKey'] ?? '';
  $model = $input['model'] ?? 'claude-3-haiku-20240307';

  if (empty($apiKey)) {
    http_response_code(400);
    echo json_encode(['error' => 'API-Key erforderlich']);
    return;
  }

  $postData = json_encode([
    'model' => $model,
    'max_tokens' => 1024,
    'system' => $input['system'] ?? '',
    'messages' => [
      ['role' => 'user', 'content' => $input['prompt'] ?? '']
    ]
  ]);

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'anthropic-version: 2023-06-01'
  ]);
  curl_setopt($ch, CURLOPT_TIMEOUT, 60);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  http_response_code($httpCode);
  echo $response;
}

function handleDeepSeek($input) {
  $url = 'https://api.deepseek.com/chat/completions';
  $apiKey = $input['apiKey'] ?? '';
  $model = $input['model'] ?? 'deepseek-chat';

  if (empty($apiKey)) {
    http_response_code(400);
    echo json_encode(['error' => 'API-Key erforderlich']);
    return;
  }

  $postData = json_encode([
    'model' => $model,
    'messages' => [
      ['role' => 'system', 'content' => $input['system'] ?? ''],
      ['role' => 'user', 'content' => $input['prompt'] ?? '']
    ],
    'temperature' => 0.7
  ]);

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
  ]);
  curl_setopt($ch, CURLOPT_TIMEOUT, 60);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  http_response_code($httpCode);
  echo $response;
}

function handleTTS($input) {
  set_time_limit(0);

  $text      = $input['text']      ?? '';
  $speaker   = $input['speaker']   ?? 'aiden';
  $instruct  = $input['instruct']  ?? '';
  $mode      = $input['mode']      ?? 'custom';   // 'custom' | 'clone'
  $refAudio  = $input['ref_audio'] ?? '';
  $refText   = $input['ref_text']  ?? '';

  if (empty($text)) {
    http_response_code(400);
    echo json_encode(['error' => 'Text erforderlich']);
    return;
  }

  $pythonBin   = '/mnt/Daten/KI/qwen3-tts/venv/bin/python3';
  $ttsScript   = '/var/www/html/tts/tts_generate.py';
  $modelCustom = '/mnt/Daten/KI/huggingface-cache/hub/models--Qwen--Qwen3-TTS-12Hz-0.6B-CustomVoice/snapshots/85e237c12c027371202489a0ec509ded67b5e4b5';
  $tmpFile     = sys_get_temp_dir() . '/ki_kaiser_tts_' . uniqid() . '.wav';

  if ($mode === 'clone' && !empty($refAudio)) {
    // Voice-Clone-Modus
    $args  = '--mode '     . escapeshellarg('clone');
    $args .= ' --text '    . escapeshellarg($text);
    $args .= ' --language '. escapeshellarg('German');
    $args .= ' --ref_audio '. escapeshellarg($refAudio);
    $args .= ' --output '  . escapeshellarg($tmpFile);
    $args .= ' --model '   . escapeshellarg($modelCustom);
    if (!empty($refText)) {
      $args .= ' --ref_text ' . escapeshellarg($refText);
    }
  } else {
    // Preset-Sprecher-Modus
    $args  = '--mode '     . escapeshellarg('custom');
    $args .= ' --text '    . escapeshellarg($text);
    $args .= ' --language '. escapeshellarg('German');
    $args .= ' --speaker ' . escapeshellarg($speaker);
    $args .= ' --output '  . escapeshellarg($tmpFile);
    $args .= ' --model '   . escapeshellarg($modelCustom);
    if (!empty($instruct)) {
      $args .= ' --instruct ' . escapeshellarg($instruct);
    }
  }

  $cmd = 'NUMBA_CACHE_DIR=' . escapeshellarg(sys_get_temp_dir() . '/numba_cache') .
         ' ' . escapeshellarg($pythonBin) .
         ' ' . escapeshellarg($ttsScript) .
         ' ' . $args . ' 2>&1';

  $output = shell_exec($cmd);

  if (!file_exists($tmpFile) || filesize($tmpFile) < 100) {
    http_response_code(502);
    echo json_encode(['error' => 'TTS-Generierung fehlgeschlagen', 'details' => trim($output ?? 'Keine Ausgabe')]);
    return;
  }

  header('Content-Type: audio/wav');
  header('Content-Length: ' . filesize($tmpFile));
  header('Cache-Control: no-store');
  readfile($tmpFile);
  unlink($tmpFile);
}

function handleTTSVoices() {
  $voicesDir = '/var/www/html/tts/audio/voices';
  $audioExts = ['wav', 'mp3', 'ogg', 'flac'];

  // Preset-Stimmen (im TTS-Modell eingebaut)
  $presetSpeakers = ['aiden', 'dylan', 'eric', 'ono_anna', 'ryan', 'serena', 'sohee', 'uncle_fu', 'vivian'];
  $voices = [];

  // Preset-Stimmen eintragen
  foreach ($presetSpeakers as $sp) {
    $voices[] = ['name' => $sp, 'path' => '', 'type' => 'preset'];
  }

  // Custom voices aus dem Verzeichnis
  $realDir = realpath($voicesDir);
  if ($realDir && is_dir($realDir)) {
    $handle = opendir($realDir);
    if ($handle) {
      while (false !== ($entry = readdir($handle))) {
        if ($entry === '.' || $entry === '..') continue;
        $fullPath = $realDir . '/' . $entry;
        if (!is_file($fullPath)) continue;
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        if (!in_array($ext, $audioExts)) continue;
        $basename   = pathinfo($entry, PATHINFO_FILENAME);
        $txtPath    = $realDir . '/' . $basename . '.txt';
        $transcript = file_exists($txtPath) ? trim(file_get_contents($txtPath)) : '';
        $voices[] = ['name' => $basename, 'path' => $fullPath, 'type' => 'clone', 'transcript' => $transcript];
      }
      closedir($handle);
    }
  }

  echo json_encode(['voices' => $voices]);
}

function handleOllamaModels() {
  $ch = curl_init('http://localhost:11434/api/tags');
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Ollama nicht erreichbar', 'details' => $curlError ?: "HTTP $httpCode"]);
    return;
  }

  echo $response;
}

function handleOllama($input) {
  $url = 'http://localhost:11434/api/generate';
  $model = $input['model'] ?? 'qwen2.5:7b';

  $postData = json_encode([
    'model' => $model,
    'prompt' => ($input['system'] ?? '') . "\n\n" . ($input['prompt'] ?? ''),
    'stream' => false,
    'options' => [
      'temperature' => 0.7
    ]
  ]);

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
  curl_setopt($ch, CURLOPT_TIMEOUT, 120);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Ollama-Anfrage fehlgeschlagen', 'details' => $curlError ?: "HTTP $httpCode", 'model' => $model]);
    return;
  }

  echo $response;
}
?>
