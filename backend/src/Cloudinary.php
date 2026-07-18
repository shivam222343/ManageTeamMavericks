<?php
namespace App;

class Cloudinary {
    /**
     * Upload a local file to Cloudinary using standard PHP Curl.
     * Returns an array with secure_url, public_id, etc. on success, or null on failure.
     */
    public static function upload(string $filePath): ?array {
        if (!defined('CLOUDINARY_CLOUD_NAME') || empty(CLOUDINARY_CLOUD_NAME)) {
            return null;
        }

        $timestamp = time();
        $params = [
            'timestamp' => $timestamp
        ];
        
        // Construct signature string: parameters sorted alphabetically
        $signStr = "timestamp=" . $timestamp . CLOUDINARY_API_SECRET;
        $signature = sha1($signStr);

        $postFields = [
            'file' => new \CURLFile($filePath),
            'api_key' => CLOUDINARY_API_KEY,
            'timestamp' => $timestamp,
            'signature' => $signature
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/" . CLOUDINARY_CLOUD_NAME . "/auto/upload");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Prevent local cert bundle failures
        
        $result = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            error_log("Cloudinary Curl Error: " . $err);
            return null;
        }

        $data = json_decode($result, true);
        if (isset($data['secure_url'])) {
            return [
                'secure_url' => $data['secure_url'],
                'public_id' => $data['public_id'],
                'format' => $data['format'] ?? '',
                'bytes' => $data['bytes'] ?? 0
            ];
        }

        error_log("Cloudinary Upload Error: " . ($data['error']['message'] ?? 'Unknown error'));
        return null;
    }
}
