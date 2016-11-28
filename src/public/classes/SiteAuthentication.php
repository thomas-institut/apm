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
 */

namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use \Dflydev\FigCookies\FigRequestCookies;
use Dflydev\FigCookies\SetCookie;
use Dflydev\FigCookies\FigResponseCookies;

require 'vendor/autoload.php';

/**
 * Middleware class for site authentication
 *
 */
class SiteAuthentication {
    
    protected $ci;
   
    private $cookieName = 'rme';
    private $secret = '1256106427895916503';
   
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


    public function authenticate(Request $request, Response $response, $next) {
        session_start();
        $success = false;
        if (!isset($_SESSION['userid'])){
            // Check for long term cookie
            error_log('Site Auth : no session');
            $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
            if ($longTermCookie !== NULL and $longTermCookie->getValue()){
                error_log('Site Auth: Cookie = ' . print_r($longTermCookie, true));
                $cookieValue = $longTermCookie->getValue();
                list($userId, $token, $mac) = explode(':', $cookieValue);
                if (hash_equals($this->generateMac($userId . ':' . $token), $mac)){
                    $userToken = $this->ci->db->getUserToken($userId);
                    if (hash_equals($userToken, $token)){
                        error_log('Site Auth: Cookie looks good, user = ' . $userId);
                        $success = true;
                    }
                    else {
                        error_log('Site Auth: User tokens do not match -> ' . $userToken . ' vs ' . $token);
                    }
                } else {
                    error_log('Site Auth: macs do not match!');
                }
                
            } else {
                error_log('Site Auth : ... and no cookie. Fail!');
            }
        } else {
            $userId = $_SESSION['userid'];
            error_log('Site Auth: Session is set, user id = ' . $userId);
            $success = true;
        }
        
        
        if ($success){
            error_log('Site Auth: go ahead');
            $_SESSION['userid'] = $userId;
            $this->ci['userInfo'] = $this->ci['db']->getUserInfoByUserId($userId);
            return $next($request, $response); 
        } else {
            error_log("Site Auth: Redirecting to login");
            return $response->withHeader('Location', $this->ci->router->pathFor('login'));
        }
    }
    
    public function login(Request $request, Response $response, $next){
        session_start();
        $db = $this->ci->db;
        error_log('Site Auth : Showing login page');
        if ($request->isPost()){
            $data = $request->getParsedBody();
            if (isset($data['user']) && isset($data['pwd'])){
                $user = filter_var($data['user'], FILTER_SANITIZE_STRING);
                $pwd = filter_var($data['pwd'], FILTER_SANITIZE_STRING);
                error_log('Trying to log in user ' . $user);
                if ($db->usernameExists($user) and password_verify($pwd, $db->userPassword($user))){
                    error_log('Success!');
                    // Success!
                    $userId = $db->getUserIdByUsername($user);
                    $token = $this->generateRandomToken();
                    $db->storeUserToken($userId, $token);
                    $cookieValue = $this->generateLongTermCookieValue($token, $userId);
                    $_SESSION['userid'] = $userId;
                    $now = new \DateTime();
                    $cookie = SetCookie::create($this->cookieName)
                            ->withValue($cookieValue)
                            ->withExpires($now->add(new \DateInterval('P14D')));
                    $response = FigResponseCookies::set($response, $cookie);
                    return $response->withHeader('Location', $this->ci->router->pathFor('home'));
                }
                else {
                    error_log('Wrong user/password for user  ' . $user);
                }
            }
        }
        $msg = '';
        return $this->ci->view->render($response, 'login.twig', [ 'message' => $msg, 'baseurl' => $this->ci->settings['baseurl']]);
    }
    
    public function logout(Request $request, Response $response, $next) {
        session_start();
        error_log('Logging out');
        session_unset();
        session_destroy();
        $response = FigResponseCookies::expire($response, $this->cookieName);
        return $response->withHeader('Location', $this->ci->router->pathFor('home'));
    }
    
    
}