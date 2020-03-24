<?php


namespace APM\System;


use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;

class RouteMiddleware implements MiddlewareInterface, LoggerAwareInterface
{

    use LoggerAwareTrait;

    /**
     * @var string
     */
    private $directBase;
    /**
     * @var string
     */
    private $proxyBase;
    private $container;


    public function __construct($container)
    {
        $this->directBase = '';
        $this->proxyBase = '/apm';
        $this->container = $container;
    }

    /**
     * @inheritDoc
     */
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {


        $this->logger->debug('URI: ' . $request->getUri());

        if ($request->hasHeader('X-Forwarded-Host')) {
            $xforwardedHost = $request->getHeader('X-Forwarded-Host');
            $this->logger->info('Proxied request: ', $xforwardedHost);
            $this->container->set(ApmContainerKey::IS_PROXIED, true);
        }

        return $handler->handle($request);
    }
}