<?php
namespace App;

class Cache {
    private static ?\Redis $redis = null;
    private static bool $redisAttempted = false;
    private static ?string $cacheDir = null;

    private static function getRedis(): ?\Redis {
        if (self::$redisAttempted) {
            return self::$redis;
        }
        self::$redisAttempted = true;
        if (class_exists('Redis')) {
            try {
                $r = new \Redis();
                if ($r->connect('127.0.0.1', 6379, 0.2)) {
                    self::$redis = $r;
                }
            } catch (\Exception $e) {
                // Redis is down or unavailable
            }
        }
        return self::$redis;
    }

    private static function getCacheDir(): string {
        if (self::$cacheDir === null) {
            self::$cacheDir = dirname(__DIR__) . '/cache';
            if (!is_dir(self::$cacheDir)) {
                @mkdir(self::$cacheDir, 0777, true);
            }
        }
        return self::$cacheDir;
    }

    public static function get(string $key) {
        $redis = self::getRedis();
        if ($redis) {
            try {
                $val = $redis->get($key);
                return $val !== false ? json_decode($val, true) : null;
            } catch (\Exception $e) {
                // Fallback to file cache
            }
        }

        // File cache fallback
        $file = self::getCacheDir() . '/' . md5($key) . '.json';
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if (isset($data['expiry']) && $data['expiry'] > time()) {
                return $data['value'];
            }
            @unlink($file);
        }
        return null;
    }

    public static function set(string $key, $value, int $ttl = 300): void {
        $redis = self::getRedis();
        if ($redis) {
            try {
                $redis->set($key, json_encode($value), $ttl);
                return;
            } catch (\Exception $e) {
                // Fallback to file cache
            }
        }

        // File cache fallback
        $file = self::getCacheDir() . '/' . md5($key) . '.json';
        $data = [
            'expiry' => time() + $ttl,
            'value' => $value
        ];
        @file_put_contents($file, json_encode($data));
    }

    public static function clear(string $key): void {
        $redis = self::getRedis();
        if ($redis) {
            try {
                $redis->del($key);
            } catch (\Exception $e) {
                // Fallback
            }
        }

        $file = self::getCacheDir() . '/' . md5($key) . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }

    public static function clearAll(): void {
        $redis = self::getRedis();
        if ($redis) {
            try {
                $redis->flushDB();
            } catch (\Exception $e) {}
        }
        $dir = self::getCacheDir();
        $files = glob($dir . '/*.json');
        if ($files) {
            foreach ($files as $file) {
                @unlink($file);
            }
        }
    }
}
