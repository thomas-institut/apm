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
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use DateInterval;
use DateTime;
use Exception;
use Monolog\Logger;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Dflydev\FigCookies\FigRequestCookies;
use Dflydev\FigCookies\SetCookie;
use Dflydev\FigCookies\FigResponseCookies;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Response;
use Slim\Views\Twig;
use ThomasInstitut\EntitySystem\Tid;
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
    protected RouteParserInterface $router;

   
    private string $cookieName = 'rme2';
    private string $secret = '1256106427895916503';
    private bool $debugMode;
   
    //Constructor



    private Twig $view;
    private SystemManager $systemManager;
    private SimpleProfiler $profiler;
    private UserManagerInterface $userManager;

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
        $this->userManager = $this->systemManager->getUserManager();
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

    private function generateLongTermCookieValue($token, $userTid): string
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

    /**
     * @throws UserNotFoundException
     * @throws PersonNotFoundException
     */
    public function authenticateSiteRequest(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($this->debugMode) {
            $this->profiler->start();
        }

        session_start();

        $this->debug('Starting authenticator middleware');


        $success = false;
        if (!isset($_SESSION['userTid'])){
            // Check for long term cookie
            $this->debug('SITE : No session');
            $userTid = $this->getUserTidFromLongTermCookie($request);
            if ($userTid > 0) {
                $success = true;
            }
        } else {
            $userTid = intval($_SESSION['userTid']);
            $this->debug('SITE : Session is set, user tid = ' . $userTid);
            if ($this->userManager->isUser($userTid)){
                $this->debug("Tid $userTid is a user");
                $success = true;
            } else {
                $this->debug("Tid $userTid is NOT a user");
            }
        }
        if ($success){
            $this->debug('SITE: Success, go ahead!');
            $_SESSION['userid'] = $userTid;
            $this->container->set(ApmContainerKey::SITE_USER_TID, $userTid);

//            $userData = $this->userManager->getUserData($userTid);
//
//            $userInfo = $userData->getExportObject();
//            unset($userInfo['passwordHash']);
//
//            $personData = $this->systemManager->getPersonManager()->getPersonEssentialData($userTid);
//            // legacy data
//            // TODO: get rid of this!
//            $userInfo['name'] = $personData->name;
//            $userInfo['email'] = '';
//            $userInfo['isRoot'] = $userData->root;
//            $userInfo['manageUsers'] = $userData->root;
//            $userInfo['tidString'] = Tid::toBase36String($userData->tid);

//            $this->container->set(ApmContainerKey::USER_DATA, $userInfo);
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
            $response = new Response();
            $cookie = SetCookie::create($this->cookieName);
            $response = FigResponseCookies::set($response, $cookie->expire());

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
     * @throws SyntaxError
     * @throws RuntimeError
     * @throws UserNotFoundException
     * @throws LoaderError
     * @throws Exception
     */
    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
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
                $userName = htmlspecialchars($data['user']);
                $pwd = htmlspecialchars($data['pwd']);
                $rememberMe = $data['rememberme'] ?? '';
                $this->debug('Trying to log in user ' . $userName);
                $userTid = $this->userManager->getUserTidForUserName($userName);

                if ($userTid !== -1 && $this->userManager->verifyPassword($userTid, $pwd)){
                    $userAgent = $request->getHeader('User-Agent')[0];
                    $ipAddress = $request->getServerParams()['REMOTE_ADDR'];
                    $this->siteLogger->info("Login", [
                        'tid' => $userTid,
                        'tidString' => Tid::toBase36String($userTid),
                        'username' => $userName,
                        'user_agent' => $userAgent,
                        'ip_address' => $ipAddress
                    ]);
                    // Success!
                    $_SESSION['userid'] = $userTid;
                    $this->debug('Generating token cookie');
                    $token = $this->generateRandomToken();
                    $this->userManager->storeToken(
                            $userTid,
                            $userAgent,
                            $ipAddress,
                            $token
                    );
                    $cookieValue = $this->generateLongTermCookieValue($token, 
                            $userTid);
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
                            ['user' => $userName]);
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
    
    public function logout(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $this->debug('Logout request');
        session_start();
        if (!isset($_SESSION['userid'])){
            $this->siteLogger->error("Logout attempt without a valid session");
            return $response->withHeader('Location', 
                $this->router->urlFor('home'))->withStatus(302);
        }
        $userTid = intval($_SESSION['userid']);
        try {
            $userData = $this->userManager->getUserData($userTid);
        } catch (UserNotFoundException) {
            $this->siteLogger->error("Can't get username from user Id at "
                . "logout attempt", ['userTid' => $userTid]);
        }

        $userAgent = $request->getHeader('User-Agent')[0];
        $ipAddress = $request->getServerParams()['REMOTE_ADDR'];

        $this->siteLogger->info('Logout',
            [
                'tid' => $userTid,
                'tidString' => Tid::toBase36String($userTid),
                'username' => $userData->userName ?? '',
                'user_agent' => $userAgent,
                'ip_address' => $ipAddress
            ]
        );
        session_unset();
        session_destroy();
        $cookie = SetCookie::create($this->cookieName);
        $response = FigResponseCookies::set($response, $cookie->expire());
        $this->userManager->removeToken($userTid, $userAgent );
        return $response->withHeader('Location',$this->router->urlFor('home'))
            ->withStatus(302);
    }

    public function authenticateDataApiRequest(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->container->set(ApmContainerKey::API_USER_TID, 0);
        return $handler->handle($request);
    }
    
    
    public function authenticateApiRequest (ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($this->debugMode) {
            $this->profiler->start();
        }
        $userTid = $this->getUserTidFromLongTermCookie($request);
        if ($userTid <= 0){
            $this->apiLogger->notice("Authentication fail");
            $response = new Response();
            return $response->withStatus(401);
        }
        $this->debug('API : Success, go ahead!');
        $this->container->set(ApmContainerKey::API_USER_TID, $userTid);
        if ($this->debugMode) {
            $this->profiler->stop();
            $this->debug("Profiler", $this->profiler->getLaps());
        }
        return $handler->handle($request);
    }
    
    private function getUserTidFromLongTermCookie(ServerRequestInterface $request): int
    {
        $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
        $cookieValue = $longTermCookie->getValue();
        if (!is_null($cookieValue)){
            list($userTid, $token, $mac) = explode(':', $cookieValue);
            $userTid = intval($userTid);
            if (hash_equals($this->generateMac($userTid . ':' . $token), $mac)) {
                try {
                    $userToken = $this->userManager->getTokenByUserAgent(
                        $userTid,
                        $request->getHeader('User-Agent')[0]
                    );
                } catch (UserNotFoundException) {
                    return -1;
                }
                if (hash_equals($userToken, $token)){
                    return $userTid;
                }
                $this->debug('User tokens do not match -> ' . $userToken . 
                        ' vs ' . $token);
                return -1;
            } 
            $this->debug('Macs do not match!');
            return -1;
        }
        $this->debug('There is no long term cookie. Fail!');
        return -1;
    }
    
}