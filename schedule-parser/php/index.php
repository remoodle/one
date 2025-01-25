<?php

declare(strict_types=1);

use Smalot\PdfParser\Parser;
use Src\Schedule;

require_once __DIR__ . '/vendor/autoload.php';

if (!isset($argv[1])) {
    echo "\n".'source dir is not provided!' . "\n";
    die;
}

if (!isset($argv[2])) {
    echo "\n".'taget file is not provided!' . "\n";
    die;
}

$schedule = new Schedule();
$parser = new Parser();

$files = glob(__DIR__ . '/' . $argv[1] . '/*.pdf');

$res = [];
foreach ($files as $file) {
    $res = array_merge($res, $schedule->parsePdfScedule($parser->parseFile($file)));
}

file_put_contents($argv[2], str_replace("\t", " ", json_encode($res, JSON_PRETTY_PRINT)));
