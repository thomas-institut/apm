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

use APM\System\ApmContainerKey;
use APM\System\SystemManager;
use AverroesProject\Data\UserManager;
use DateInterval;
use DateTime;
use Dflydev\FigCookies\Cookies;
use Dflydev\FigCookies\Modifier\SameSite;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use Monolog\Logger;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use \Dflydev\FigCookies\FigRequestCookies;
use \Dflydev\FigCookies\SetCookie;
use \Dflydev\FigCookies\FigResponseCookies;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Interfaces\RouteParserInterface;
use Slim\Routing\RouteParser;
use Slim\Views\Twig;
use ThomasInstitut\Profiler\SimpleProfiler;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Middleware class for site authentication
 *
 */
class Authenticator {


    const LOGIN_PAGE_SIGNATURE = 'Login-8gRSSm23HPdStrEid5Wi';


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

    /**
     * @var RouteParser|RouteParserInterface
     */
    protected RouteParserInterface|RouteParser $router;

   
    private string $cookieName = 'rme';
    private string $secret = '1256106427895916503';
    private bool $debugMode;
   
    //Constructor

    /**
     * @var UserManager
     */
    private UserManager $userManager;
    /**
     * @var Twig
     */
    private Twig $view;

    /**
     * @var SystemManager
     */
    private SystemManager $systemManager;
    private SimpleProfiler $profiler;

    /**
     * Authenticator constructor.
     * @param ContainerInterface $ci
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
        $this->router = $this->systemManager->getRouter();
        $this->userManager = $this->systemManager->getDataManager()->userManager;
        $this->logger = $this->systemManager->getLogger()->withName('AUTH');
        $this->view = $this->systemManager->getTwig();
        $this->apiLogger = $this->logger->withName('AUTH-API');
        $this->siteLogger = $this->logger->withName('AUTH-SITE');
        $this->profiler = new SimpleProfiler();

        $this->debugMode = false;
    }

    /**
     * @return string
     */
    private function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    /**
     * @return string
     * @throws Exception
     */
    private function generateRandomToken(): string
    {
        return bin2hex(random_bytes(20));
    }

    private function generateLongTermCookieValue($token, $userId): string
    {
        $v = $userId . ':' . $token;
        return $v . ':' . $this->generateMac($v);
    }
    
    private function generateMac($v): string
    {
        return hash_hmac('sha256', $v, $this->secret);
    }

    /**
     * Logs a debug message in the logger
     * @codeCoverageIgnore
     *
     * @param string $msg
     * @param array $data
     */
    private function debug(string $msg, array $data=[]): void
    {
        if ($this->debugMode){
            $this->logger->debug($msg, $data);
        }
    }

    public function authenticate(Request $request, RequestHandlerInterface $handler): Response
    {
        if ($this->debugMode) {
            $this->profiler->start();
        }


        session_start();

        $this->debug('Starting authenticator middleware');


        $success = false;
        if (!isset($_SESSION['userid'])){
            // Check for long term cookie
            $this->debug('SITE : No session');
            $userId = $this->getUserIdFromLongTermCookie($request);
            if ($userId !== false) {
                $success = true;
            }
        } else {
            $userId = $_SESSION['userid'];
            $this->debug('SITE : Session is set, user id = ' . $userId);
            if ($this->userManager->userExistsById($userId)){
                $this->debug("User id exists!");
                $success = true;
            } else {
                $this->debug("User id does not exist!");
            }
            
        }
        if ($success){
            $this->debug('SITE: Success, go ahead!');
            $_SESSION['userid'] = $userId;
            $ui = $this->userManager->getUserInfoByUserId($userId);
            if ($this->userManager->isUserAllowedTo($userId, 'manageUsers')){
                $ui['manageUsers'] = 1;
            }
            if ($this->userManager->isRoot($userId)) {
                $ui['isRoot'] = true;
            }

            $this->container->set(ApmContainerKey::USER_INFO, $ui);
            if ($this->debugMode) {
                $this->profiler->stop();
                $this->debug("Profiler", $this->profiler->getLaps());
            }
            return $handler->handle($request);
        } else {
            $this->debug("SITE : Authentication fail, logging out "
                    . "and redirecting to login");
            session_unset();
            session_destroy();
            $response = new \Slim\Psr7\Response();
            $response = FigResponseCookies::expire($response, 
                    $this->cookieName);

            $loginUrl = $this->router->urlFor('login');
            $this->logger->debug('Redirecting to ' . $loginUrl);
            return $response->withHeader('Location', $loginUrl)->withStatus(302);
        }
    }

    protected function responseWithJson(ResponseInterface $response, array $data,int $status = 200) : ResponseInterface {
        $response->getBody()->write(json_encode($data));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }


    /**
     * Authenticates a user via API call
     *   If the request includes cookies, it will use them to try to authenticate the
     *   user that way. Otherwise, it will look for user/pwd in data.
     *   Will send a cookie with the authentication token both in the Set-Cookie
     *   header and as part of the response data (together with user information)
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function apiLogin(Request $request, Response $response): Response {
        $this->debugMode = true;
        $this->debug('API Login request');
        $this->debug("Login headers", $request->getHeaders());
        $this->debug('Request method is ' . $request->getMethod());
        $origin = $request->getHeaders()["Origin"];
        // TODO: check origin against list of valid origins
        $response = $response->withHeader("Access-Control-Allow-Origin", $origin)->withHeader("Access-Control-Allow-Credentials", "true");

        // first try the authentication cookie
        $cookies = Cookies::fromRequest($request);
        if ($cookies->has($this->cookieName)) {
            $userId = $this->getUserIdFromLongTermCookie($request);
            if ($userId !== false){
                $this->apiLogger->info("User $userId authenticated with long term cookie");
                $userData = $this->userManager->getUserInfoByUserId($userId);
                return $this->responseWithJson($response, ['userId' => $userId, 'userData' => $userData]);
           }
            $this->debug("Cookie is no good, will try user/pwd");
        }
        // no luck, try user/pwd in post
        if ($request->getMethod() === 'POST') {
            $data = $request->getParsedBody();
            // DON'T DO THIS:    $this->debug('Got POST data', $data);
            // ... it will show the user password in the log!
            if (isset($data['user']) && isset($data['pwd'])){
                $this->debug('Got data for login');
                $user = htmlspecialchars($data['user']);
                $pwd = htmlspecialchars($data['pwd']);
                $redirectUrl = $data['redirect'] ?? '';
                $this->debug('Trying to log in user ' . $user);
                if ($this->userManager->verifyUserPassword($user, $pwd)){
                    $userAgent = $request->getHeader('User-Agent')[0];
                    $ipAddress = $request->getServerParams()['REMOTE_ADDR'];
                    $this->apiLogger->info("API Login", ['user' => $user, 'user_agent' => $userAgent, 'ip_address' => $ipAddress ]);
                    // Success!
                    $userId = $this->userManager->getUserIdFromUsername($user);
                    $this->debug('Generating token cookie');
                    $token = $this->generateRandomToken();
                    $this->userManager->storeUserToken(
                        $userId,
                        $userAgent,
                        $ipAddress,
                        $token
                    );
                    $cookieValue = $this->generateLongTermCookieValue($token,
                        $userId);
                    $now = new DateTime();
                    $cookie = SetCookie::create($this->cookieName)
                        ->withValue($cookieValue)->withSameSite(SameSite::none())->withSecure(true)
                        ->withExpires($now->add(
                        new DateInterval('P14D')));
                    $response = FigResponseCookies::set($response, $cookie);
                    $this->debug("Redirect URL '$redirectUrl'");
                    if ($this->isValidRedirectUrl($redirectUrl)) {
                        return $response->withHeader('Location',
                            $redirectUrl);
                    }
                    $this->apiLogger->info("User $userId authenticated with user/pwd data");
                    $userData = $this->userManager->getUserInfoByUserId($userId);
                    return $this->responseWithJson($response, [
                        'userId' => $userId,
                        'userData' => $userData,
                        'authCookie' => $cookie->__toString()
                    ]);
                }
                else {
                    $this->apiLogger->notice('Wrong user/password',
                        ['user' => $user]);
                }
            } else {
                $this->debug("No user or password in data");
            }
        }

        // Authentication fail
        return $response->withStatus(401);
    }

    private function isValidRedirectUrl($url) : bool {
        if (is_null($url) || $url === '') {
            return false;
        }
        // TODO: check against a list of valid urls
        return true;
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws LoaderError
     * @throws RuntimeError
     * @throws SyntaxError
     * @throws Exception
     */
    public function login(Request $request, Response $response): Response
    {
        session_start();
        $this->debug('Site Login request');
        $this->debug("Login headers", $request->getHeaders());
        $this->debug('Request method is ' . $request->getMethod());
        $msg = '';
        if ($request->getMethod() === 'POST') {
            $data = $request->getParsedBody();
            // DON'T DO THIS:    $this->debug('Got POST data', $data);
            // ... it will show the user password in the log!
            if (isset($data['user']) && isset($data['pwd'])){
                $this->debug('Got data for login');
                $user = htmlspecialchars($data['user']);
                $pwd = htmlspecialchars($data['pwd']);
                $rememberMe = $data['rememberme'] ?? '';
                $this->debug('Trying to log in user ' . $user);
                if ($this->userManager->verifyUserPassword($user, $pwd)){
                    $userAgent = $request->getHeader('User-Agent')[0];
                    $ipAddress = $request->getServerParams()['REMOTE_ADDR'];
                    $this->siteLogger->info("Login", ['user' => $user, 'user_agent' => $userAgent, 'ip_address' => $ipAddress ]);
                    // Success!
                    $userId = $this->userManager->getUserIdFromUsername($user);
                    $_SESSION['userid'] = $userId;
                    $this->debug('Generating token cookie');
                    $token = $this->generateRandomToken();
                    $this->userManager->storeUserToken(
                            $userId, 
                            $userAgent, 
                            $ipAddress,
                            $token
                    );
                    $cookieValue = $this->generateLongTermCookieValue($token, 
                            $userId);
                    if ($rememberMe === 'on'){
                        $this->debug('User wants to be remembered');
                        $now = new DateTime();
                        $cookie = SetCookie::create($this->cookieName)
                                ->withValue($cookieValue)
                                ->withExpires($now->add(
                                        new DateInterval('P14D')));
                    } else {
                        $cookie = SetCookie::create($this->cookieName)
                                ->withValue($cookieValue);
                    }
                    
                    $response = FigResponseCookies::set($response, $cookie);
                    return $response->withHeader('Location', 
                            $this->router->urlFor('home'))->withStatus(302);
                }
                else {
                    $this->siteLogger->notice('Wrong user/password', 
                            ['user' => $user]);
                    $msg = "Wrong username/password, please try again";
                }
            }
        }
        // not authenticated

        $this->debug('Showing login page');

        return $this->view->render($response, 'login.twig',
                [
                    'message' => $msg,
                    'baseurl' => $this->getBaseUrl(),
                    'signature' => self::LOGIN_PAGE_SIGNATURE
                ]);
    }
    
    public function logout(Request $request, Response $response)
    {
        $this->debug('Logout request');
        session_start();
        if (!isset($_SESSION['userid'])){
            $this->siteLogger->error("Logout attempt without a valid session");
            return $response->withHeader('Location', 
                $this->router->urlFor('home'))->withStatus(302);
        }
        $userId = $_SESSION['userid'];
        $userName = $this->userManager->getUsernameFromUserId($userId);
        if ($userName === false) {
            $this->siteLogger->error("Can't get username from user Id at "
                    . "logout attempt", ['userId' => $userId]);
        }
        $this->siteLogger->info('Logout', ['user' => $userName]);
        session_unset();
        session_destroy();
        $response = FigResponseCookies::expire($response, $this->cookieName);
        return $response->withHeader('Location',$this->router->urlFor('home'))
            ->withStatus(302);
    }

    public function authenticateDataApiRequest(Request $request, RequestHandlerInterface $handler): Response
    {
        $this->container->set(ApmContainerKey::API_USER_ID, 0);
        //$this->logger->debug("DataApi headers", $request->getHeaders());
        return $handler->handle($request);
    }
    
    
    public function authenticateApiRequest (Request $request, RequestHandlerInterface $handler): \Slim\Psr7\Response|Response
    {
        $this->debugMode = true;
        if ($this->debugMode) {
            $this->profiler->start();
        }
        $userId = $this->getUserIdFromLongTermCookie($request);
        if ($userId === false){
            $this->apiLogger->notice("Authentication fail");
            $response = new \Slim\Psr7\Response();
            return $response->withStatus(401);
        }
        $this->debug('API : Success, go ahead!');
        $this->container->set(ApmContainerKey::API_USER_ID, $userId);
        if ($this->debugMode) {
            $this->profiler->stop();
            $this->debug("Profiler", $this->profiler->getLaps());
        }
        return $handler->handle($request);
    }
    
    private function getUserIdFromLongTermCookie(Request $request)
    {
        //$this->debug('Checking long term cookie');
        $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
        if (!is_null($longTermCookie) and $longTermCookie->getValue()){
            $cookieValue = $longTermCookie->getValue();
            list($userId, $token, $mac) = explode(':', $cookieValue);
            if (hash_equals($this->generateMac($userId . ':' . $token), $mac)) {
                $userToken = $this->userManager->getUserToken(
                    $userId,
                    $request->getHeader('User-Agent')[0]
                );
                if (hash_equals($userToken, $token)){
                    //$this->debug('Cookie looks good, user = ' . $userId);
                    return $userId;
                }
                $this->debug('User tokens do not match -> ' . $userToken . 
                        ' vs ' . $token);
                return false;
            } 
            $this->debug('Macs do not match!');
            return false;
        }
        $this->debug('There is no long term cookie. Fail!');
        return false;
    }
    
}