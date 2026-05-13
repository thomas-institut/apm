<?php

namespace ThomasInstitut\StandardApi;

use InvalidArgumentException;
use Slim\Interfaces\RouteCollectorInterface;
use Slim\Interfaces\RouteCollectorProxyInterface;

class RouteBuilder
{
    const array AnyMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

    /**
     * Build routes from a tuple array.
     *
     * Each tuple is an array of 3 elements:
     * [0] => HTTP method (GET, POST, PUT, PATCH, DELETE, OPTIONS)
     * [1] => Path (e.g., /api/users/{id})
     * [2] => [Class name, Method name]
     *
     * @param RouteCollectorInterface|RouteCollectorProxyInterface $routeCollector
     * @param array<array{0: string, 1: string, 2: array{0: string, 1: string}}> $tupleArray
     * @return void
     */
    static public function build(RouteCollectorInterface|RouteCollectorProxyInterface $routeCollector, array $tupleArray): void
    {
        $collectorValidMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
        $tupleValidMethods = array_values($collectorValidMethods);
        $tupleValidMethods[] = 'ANY';
        $tupleValidMethods[] = '*';


        foreach ($tupleArray as $tupleIndex => $tuple) {
            if (count($tuple) !== 3) {
                throw new InvalidArgumentException("Tuple $tupleIndex does not have 3 elements: " . json_encode($tuple));
            }

            if (!is_string($tuple[0]) || strlen($tuple[0]) === 0) {
                throw new InvalidArgumentException("In tuple $tupleIndex, index 0 is not a valid method string");
            }

            if (!is_string($tuple[1]) || strlen($tuple[1]) === 0) {
                throw new InvalidArgumentException("In tuple $tupleIndex, index 1 is not a valid path string");
            }

            if (!is_array($tuple[2]) || count($tuple[2]) !== 2) {
                throw new InvalidArgumentException("In tuple $tupleIndex, index 2 must be an array of [className, methodName]");
            }

            foreach ($tuple[2] as $index => $t) {
                if (!is_string($t)) {
                    throw new InvalidArgumentException("In tuple $tupleIndex, index 2[$index] is not a string");
                }
                if (strlen($t) === 0) {
                    throw new InvalidArgumentException("In tuple $tupleIndex, index 2[$index] is empty");
                }
            }

            [$method, $path, $callable] = $tuple;
            [$className, $methodName] = $callable;

            if (!class_exists($className)) {
                throw new InvalidArgumentException("In tuple $tupleIndex, class does not exist: $className");
            }

            if (!method_exists($className, $methodName)) {
                throw new InvalidArgumentException("In tuple $tupleIndex, class method does not exist: $className::$methodName");
            }

            $method = strtoupper($method);
            if (!in_array($method, $tupleValidMethods)) {
                throw new InvalidArgumentException("In tuple $tupleIndex, invalid method: $method");
            }
            if ($method === '*' || $method === 'ANY') {
                $methods = self::AnyMethods;
            } else {
                $methods = [$method];
            }

            $routeCollector->map($methods, $path, [$className, $methodName]);
        }
    }

}