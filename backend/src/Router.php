<?php
// src/Router.php
namespace App;

class Router {
    private array $routes = [];

    /**
     * Register a route
     */
    public function addRoute(string $method, string $path, $handler): void {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler
        ];
    }

    /**
     * Resolve the current request
     */
    public function resolve(string $requestMethod, string $requestUri) {
        // Strip query string if any
        if (($pos = strpos($requestUri, '?')) !== false) {
            $requestUri = substr($requestUri, 0, $pos);
        }

        $requestUri = '/' . trim($requestUri, '/');
        $requestMethod = strtoupper($requestMethod);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            $pattern = $this->convertPathToRegex($route['path']);
            if (preg_match($pattern, $requestUri, $matches)) {
                // Remove the full match at index 0
                array_shift($matches);
                
                // Get parameter names from the route path
                preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $route['path'], $paramNames);
                $params = [];
                if (!empty($paramNames[1])) {
                    foreach ($paramNames[1] as $index => $name) {
                        if (isset($matches[$index])) {
                            $params[$name] = $matches[$index];
                        }
                    }
                }

                $handler = $route['handler'];
                if (is_array($handler)) {
                    [$controllerClass, $methodName] = $handler;
                    $controller = new $controllerClass();
                    return call_user_func_array([$controller, $methodName], [$params]);
                }

                return call_user_func_array($handler, [$params]);
            }
        }

        // Route not found
        $this->sendJson(['error' => 'Route not found: ' . $requestMethod . ' ' . $requestUri], 404);
    }

    /**
     * Helper to convert route path (e.g. /applicants/{id}) to regular expression
     */
    private function convertPathToRegex(string $path): string {
        $path = '/' . trim($path, '/');
        // Replace {param} with named or position-based regex capture group
        $pattern = preg_replace('/\{[a-zA-Z0-9_]+\}/', '([^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    /**
     * Send JSON response helper
     */
    public static function sendJson(array $data, int $statusCode = 200): void {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
}
