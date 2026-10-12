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
                $redisUrl = getenv('REDIS_URL') ?: ($_ENV['REDIS_URL'] ?? null);
                $host = getenv('REDIS_HOST') ?: ($_ENV['REDIS_HOST'] ?? '127.0.0.1');
                $port = (int)(getenv('REDIS_PORT') ?: ($_ENV['REDIS_PORT'] ?? 6379));
                $password = getenv('REDIS_PASSWORD') ?: ($_ENV['REDIS_PASSWORD'] ?? null);
                $user = getenv('REDIS_USERNAME') ?: ($_ENV['REDIS_USERNAME'] ?? null);

                $r = new \Redis();

                if (!empty($redisUrl)) {
                    $parsed = parse_url($redisUrl);
                    $host = $parsed['host'] ?? '127.0.0.1';
                    $port = (int)($parsed['port'] ?? 6379);
                    $password = $parsed['pass'] ?? null;
                    $user = $parsed['user'] ?? null;
                    if (isset($parsed['scheme']) && $parsed['scheme'] === 'rediss') {
                        $host = 'tls://' . $host;
                    }
                }

                $connected = @$r->connect($host, $port, 1.0);
                if ($connected) {
                    if (!empty($password)) {
                        if (!empty($user) && $user !== 'default') {
                            @$r->auth([$user, $password]);
                        } else {
                            @$r->auth($password);
                        }
                    }
                    self::$redis = $r;
                }
            } catch (\Exception $e) {
                // Redis is down or unavailable - will fallback to file cache seamlessly
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

    public static function checkRateLimit(string $actionKey, int $maxAttempts = 60, int $windowSeconds = 60): bool {
        $redis = self::getRedis();
        if ($redis) {
            try {
                $key = 'rate_limit:' . $actionKey;
                $current = $redis->incr($key);
                if ($current === 1) {
                    $redis->expire($key, $windowSeconds);
                }
                return $current <= $maxAttempts;
            } catch (\Exception $e) {
                // Fallback below
            }
        }

        // File-based rate limiter fallback
        $key = 'rl_' . md5($actionKey);
        $data = self::get($key);
        $now = time();
        if (!$data || $data['reset_at'] < $now) {
            $data = ['count' => 1, 'reset_at' => $now + $windowSeconds];
        } else {
            $data['count']++;
        }
        self::set($key, $data, $windowSeconds);
        return $data['count'] <= $maxAttempts;
    }
}
