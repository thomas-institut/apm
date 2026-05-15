<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

/**
 * @brief Middleware class for site authentication
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 *
 * Short term user authentication is implemented by storing the user id
 * in the PHP session.
 * Long term user authentication ('Remember me' option) is done by storing a
 * cookie in the user's browser with the user id information, a random token and
 * an encrypted hash of the used id and the token. The hash is generated using
 * a randomly chosen secret key.
 */

namespace APM\System\Auth;

use APM\Api\ApmResponseFactory;
use APM\Api\DataSchema\ApiLoginRequest;
use APM\Api\DataSchema\ApiLoginResponse;
use APM\Api\DataSchema\ApiResponse;
use APM\System\ApmContainerKey;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use APM\ToolBox\HttpStatus;
use DateInterval;
use DateTime;
use Dflydev\FigCookies\FigRequestCookies;
use Dflydev\FigCookies\FigResponseCookies;
use Dflydev\FigCookies\SetCookie;
use Exception;
use Monolog\Logger;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Random\RandomException;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Response;
use Slim\Views\Twig;
use ThomasInstitut\EntitySystem\Tid;

/**
 * Middleware class for site authentication
 *
 */
class Authenticator
{


    /**
     * @var ContainerInterface
     */
    private ContainerInterface $container;

    /**
     * @var Logger
     */
    private Logger $apiLogger;
    private Logger $siteLogger;
    private Logger $logger;
    protected RouteParserInterface $router;


    private string $cookieName = 'rme2';
    private string $secret = '1256106427895916503';
    private bool $debugMode;

    private bool $devMode;

    //Constructor


    private Twig $view;
    private SystemManager $systemManager;
    private UserManagerInterface $userManager;

    private ApmResponseFactory $responseFactory;

    /**
     * Authenticator constructor.
     * @param ContainerInterface $ci
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(SystemManager::class);
        $this->router = $this->systemManager->getRouter();
        $this->userManager = $this->systemManager->getUserManager();
        $this->logger = $this->systemManager->getLogger()->withName('AUTH');
        $this->view = $this->systemManager->getTwig();
        $this->apiLogger = $this->logger->withName('AUTH-API');
        $this->siteLogger = $this->logger->withName('AUTH-SITE');
        $this->debugMode = false;
        $this->devMode = $this->systemManager->getConfig()['devMode'] ?? false;
        $this->responseFactory = new ApmResponseFactory($this->apiLogger);
    }


    /**
     * @return string
     * @throws Exception
     */
    private function generateRandomToken(): string
    {
        try {
            return bin2hex(random_bytes(20));
        } catch (RandomException $e) {
            // should not happen really
            throw new Exception("Cannot generate random token", 0, $e);
        }
    }

    private function generateFullToken($token, $userTid): string
    {
        $v = $userTid . ':' . $token;
        return $v . ':' . $this->generateMac($v);
    }

    private function generateMac($v): string
    {
        return hash_hmac('sha256', $v, $this->secret);
    }

    /**
     * Logs a debug message in the logger
     *
     * @param string $msg
     * @param array $data
     */
    private function debug(string $msg, array $data = []): void
    {
        if ($this->debugMode) {
            $this->logger->debug($msg, $data);
        }
    }

    /**
     * @throws UserNotFoundException
     * @throws PersonNotFoundException
     */
    public function authenticateSiteRequest(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        session_start();

        $this->debug('Starting authenticator middleware');


        $success = false;
        if (!isset($_SESSION['userId'])) {
            // Check for long term cookie
            $this->debug('SITE : No session');
            $userId = $this->getUserIdFromRequest($request);
            if ($userId > 0) {
                $success = true;
            }
        } else {
            $userId = intval($_SESSION['userTid']);
            $this->debug('SITE : Session is set, user id = ' . $userId);
            if ($this->userManager->isUser($userId)) {
                $this->debug("Id $userId is a user");
                $success = true;
            } else {
                $this->debug("Id $userId is NOT a user");
            }
        }
        if ($success) {
            $this->debug('SITE: Success, go ahead!');
            $_SESSION['userid'] = $userId;
            $this->container->set(ApmContainerKey::SITE_USER_ID, $userId);
            return $handler->handle($request);
        } else {
            $this->debug("SITE : Authentication fail, logging out "
                . "and redirecting to login");
            session_unset();
            session_destroy();
            $response = new Response();
            $cookie = SetCookie::create($this->cookieName);
            $response = FigResponseCookies::set($response, $cookie->expire());

            $loginUrl = $this->router->urlFor('login');
            $this->logger->debug('Redirecting to ' . $loginUrl);
            return $response->withHeader('Location', $loginUrl)->withStatus(302);
        }
    }

    public function apiLogin(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        session_start();
        $this->debugMode = true;
        $this->debug('Login request');
        $this->debug("Login headers", $request->getHeaders());
        $this->debug('Request method is ' . $request->getMethod());
        if ($request->getMethod() === 'POST') {
            $loginRequest = $this->parseApiLoginRequestData($request);
            if ($loginRequest === null) {
                $this->debug('Cannot parse JSON data');
                return $this->responseFactory->badRequest($response);
            }

            // DON'T DO THIS:  $this->debug('Got POST data', $data); ... it will show the user password in the log!

            $userName = $loginRequest->user;
            $pwd = $loginRequest->pwd;
            $rememberMe = $loginRequest->rememberMe;
            $this->debug('Trying to log in user ' . $userName);
            $userId = $this->userManager->getUserIdForUserName($userName);

            if ($userId !== -1 && $this->userManager->verifyPassword($userId, $pwd)) {
                $userAgent = $request->getHeader('User-Agent')[0];
                $ipAddress = $request->getServerParams()['REMOTE_ADDR'];
                $this->siteLogger->info("Login", [
                    'id' => $userId,
                    'idString' => Tid::toBase36String($userId),
                    'username' => $userName,
                    'userAgent' => $userAgent,
                    'ipAddress' => $ipAddress
                ]);
                // Success!
                $_SESSION['userid'] = $userId;
                $this->debug('Generating token cookie');
                try {
                    $token = $this->generateRandomToken();
                } catch (Exception $e) {
                    $this->logger->error('Cannot generate random token', ['exception' => $e]);
                    return $this->responseFactory->internalServerError($response);
                }
                try {
                    $this->userManager->storeToken(
                        $userId,
                        $userAgent,
                        $ipAddress,
                        $token
                    );
                } catch (UserNotFoundException $e) {
                    // should never happen since the user is guaranteed to exist at this point
                    $this->logger->error('User not found while storing token', ['exception' => $e]);
                    return $this->responseFactory->internalServerError($response);
                }
                $fullToken = $this->generateFullToken($token, $userId);
                if ($rememberMe === 'on') {
                    $this->debug('User wants to be remembered');
                    $now = new DateTime();
                    $cookie = SetCookie::create($this->cookieName)
                        ->withValue($fullToken)
                        ->withExpires($now->add(
                            new DateInterval('P14D')));
                } else {
                    $cookie = SetCookie::create($this->cookieName)
                        ->withValue($fullToken);
                }

                $response = FigResponseCookies::set($response, $cookie);
                $data = new ApiLoginResponse();
                $data->result =  ApiResponse::ResultSuccess;
                $data->message = 'Login successful';
                $data->token = $fullToken;
                $data->ttl = $rememberMe === 'on' ? 30 * 24 * 3600 : 24 * 3600;
                return $this->responseFactory->success($response, $data->withTimeStampNow());
            } else {
                $this->siteLogger->notice('Wrong user/password',
                    ['user' => $userName]);
            }
        }
        // not authenticated
        $this->debug('API login unsuccessful');
        return $this->responseFactory->unauthorized($response);
    }

    /**
     * Parses the API login request body into a typed request schema.
     *
     * @param ServerRequestInterface $request
     * @return ApiLoginRequest|null
     */
    private function parseApiLoginRequestData(ServerRequestInterface $request): ?ApiLoginRequest
    {
        $data = json_decode($request->getBody()->getContents(), true);
        if (!is_array($data) || !isset($data['user'], $data['pwd'])) {
            return null;
        }

        if (!is_string($data['user']) || !is_string($data['pwd'])) {
            return null;
        }

        if (isset($data['rememberMe']) && !is_string($data['rememberMe'])) {
            return null;
        }

        $requestData = new ApiLoginRequest();
        $requestData->user = $data['user'];
        $requestData->pwd = $data['pwd'];
        $requestData->rememberMe = $data['rememberMe'] ?? '';

        return $requestData;
    }

    public function authenticateApiRequest(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $userId = $this->getUserIdFromRequest($request);
        if ($userId <= 0) {
            $response = new Response();
            return $response->withStatus(HttpStatus::UNAUTHORIZED);
        }
        $this->debug('API : Success, go ahead!');
        $this->container->set(ApmContainerKey::API_USER_ID, $userId);
        return $handler->handle($request);
    }

    /**
     * Returns the user id from the request, either from the bearer token or
     * from the long term cookie.
     *
     * Returns -1 if the user is not authenticated.
     *
     * @param ServerRequestInterface $request
     * @return int
     */
    private function getUserIdFromRequest(ServerRequestInterface $request): int
    {
        $bearer = $request->getHeader('Authorization')[0] ?? '';
        if (preg_match('/Bearer\s+(\S+)/', $bearer, $matches)) {
            $fullToken = $matches[1] ?? null;
        } else {
            $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
            $fullToken = $longTermCookie->getValue() ?? null;
        }

        if (!is_null($fullToken)) {
            $userAgent = $request->getHeader('User-Agent');
            if (count($userAgent) === 0) {
                $this->debug('No user agent in request');
                return -1;
            }
            return $this->validateToken($fullToken, $userAgent[0]);
        }
        $this->debug('Neither long term cookie nor bearer token. Fail!');
        return -1;
    }

    /**
     * Validates a token and returns the user ID if valid, -1 otherwise.
     *
     * @param string $fullToken
     * @param string $userAgent
     * @return int
     */
    public function validateToken(string $fullToken, string $userAgent): int
    {
        list($userId, $innerToken, $mac) = explode(':', $fullToken);
        $userId = intval($userId);
        if (hash_equals($this->generateMac($userId . ':' . $innerToken), $mac)) {
            try {
                $userToken = $this->userManager->getTokenByUserAgent($userId, $userAgent);
            } catch (UserNotFoundException) {
                return -1;
            }
            if (hash_equals($userToken, $innerToken)) {
                return $userId;
            }
            $this->debug('User tokens do not match -> ' . $userToken . ' vs ' . $innerToken);
            return -1;
        }
        $this->debug('Macs do not match!');
        return -1;
    }

}