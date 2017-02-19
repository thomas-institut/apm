<?php
/*
 * Copyright (C) 2016 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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

namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use \Dflydev\FigCookies\FigRequestCookies;
use \Dflydev\FigCookies\SetCookie;
use \Dflydev\FigCookies\FigResponseCookies;

/**
 * Middleware class for site authentication
 *
 */
class SiteAuthentication {
    
    protected $ci;
   
    private $cookieName = 'rme';
    private $secret = '1256106427895916503';
    private $debugMode = false;
   
    //Constructor
    public function __construct( $ci) {
        $this->ci = $ci;
    }
   
    private function generateRandomToken(){
        return bin2hex(random_bytes(20));
    }
    
    private function generateLongTermCookieValue($token, $userId){
        $v = $userId . ':' . $token;
        return $v . ':' . $this->generateMac($v);
    }
    private function generateMac($v){
        return hash_hmac('sha256', $v, $this->secret);
    }

    protected function debug($msg){
        if ($this->debugMode){
            error_log('SiteAuth : ' . $msg);
        }
    }

    public function authenticate(Request $request, Response $response, $next) {
        session_start();
        $success = false;
        if (!isset($_SESSION['userid'])){
            // Check for long term cookie
            $this->debug('No session');
            $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
            if ($longTermCookie !== NULL and $longTermCookie->getValue()){
                //$this->debug('Cookie = ' . print_r($longTermCookie, true));
                $cookieValue = $longTermCookie->getValue();
                list($userId, $token, $mac) = explode(':', $cookieValue);
                if (hash_equals($this->generateMac($userId . ':' . $token), $mac)){
                    $userToken = $this->ci->um->getUserToken($userId);
                    if (hash_equals($userToken, $token)){
                        $this->debug('Cookie looks good, user = ' . $userId);
                        $success = true;
                    }
                    else {
                        $this->debug('User tokens do not match -> ' . $userToken . ' vs ' . $token);
                    }
                } else {
                    $this->debug('Macs do not match!');
                }
                
            } else {
                $this->debug('... and no cookie. Fail!');
            }
        } else {
            $userId = $_SESSION['userid'];
            $this->debug('Session is set, user id = ' . $userId);
            if ($this->ci->um->userExistsById($userId)){
                $this->debug("User id exists!");
                $success = true;
            } else {
                $this->debug("User id does not exist!");
            }
            
        }
        
        if ($success){
            $this->debug('Success, go ahead!');
            $_SESSION['userid'] = $userId;
            $ui = $this->ci->um->getUserInfoByUserId($userId);
            if ($this->ci->um->isUserAllowedTo($userId, 'manageUsers')){
                $ui['manageUsers'] = 1;
            }
            $this->ci['userInfo'] = $ui;
            return $next($request, $response); 
        } else {
            $this->debug("Authentication fail, logging out and redirecting to login");
            session_unset();
            session_destroy();
            $response = FigResponseCookies::expire($response, $this->cookieName);
            return $response->withHeader('Location', $this->ci->router->pathFor('login'));
        }
    }
    
    public function login(Request $request, Response $response, $next){
        session_start();
        $this->debug('Login page');
        if ($request->isPost()){
            $data = $request->getParsedBody();
            if (isset($data['user']) && isset($data['pwd'])){
                $this->debug('Got data for login');
                $user = filter_var($data['user'], FILTER_SANITIZE_STRING);
                $pwd = filter_var($data['pwd'], FILTER_SANITIZE_STRING);
                $rememberme = isset($data['rememberme']) ? $data['rememberme'] : '';
                $this->debug('Trying to log in user ' . $user);
                if ($this->ci->um->verifyUserPassword($user, $pwd)){
                    $this->debug('Success!');
                    // Success!
                    $userId = $this->ci->um->getUserIdFromUsername($user);
                    $_SESSION['userid'] = $userId;
                    if ($rememberme === 'on'){
                        $this->debug('User wants to be remembered for 2 weeks');
                        $token = $this->generateRandomToken();
                        $this->ci->um->storeUserToken($userId, $token);
                        $cookieValue = $this->generateLongTermCookieValue($token, $userId);
                        $now = new \DateTime();
                        $cookie = SetCookie::create($this->cookieName)
                                ->withValue($cookieValue)
                                ->withExpires($now->add(new \DateInterval('P14D')));
                        $response = FigResponseCookies::set($response, $cookie);
                    }
                    return $response->withHeader('Location', $this->ci->router->pathFor('home'));
                }
                else {
                    $this->debug('Wrong user/password for user  ' . $user);
                }
            }
        }
        $msg = '';
        return $this->ci->view->render($response, 'login.twig', [ 'message' => $msg, 'baseurl' => $this->ci->settings['baseurl']]);
    }
    
    public function logout(Request $request, Response $response, $next) {
        session_start();
        $this->debug('Logging out');
        session_unset();
        session_destroy();
        $response = FigResponseCookies::expire($response, $this->cookieName);
        return $response->withHeader('Location', $this->ci->router->pathFor('home'));
    }
    
    
}