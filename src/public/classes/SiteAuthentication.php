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

require 'vendor/autoload.php';

/**
 * Middleware class for site authentication
 *
 */
class SiteAuthentication {
    
   protected $ci;
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
   }
  
    public function authenticate(Request $request, Response $response, $next) {
        session_start(['cookie_lifetime' => 86400,]);
        if (!isset($_SESSION['userid'])){
            error_log("Auth middleware: Redirecting to login");
            return $response->withHeader('Location', $this->ci->router->pathFor('login'));
        }
        else {
            error_log('Auth middleware: go ahead');
            $this->ci['userInfo'] = $this->ci['db']->getUserInfoByUserId($_SESSION['userid']);
            return $next($request, $response); 
        }
    }
    
    public function login(Request $request, Response $response, $next){
        session_start(['cookie_lifetime' => 86400,]);
        $db = $this->ci->db;
        error_log('Showing login page');
        if ($request->isPost()){
            $data = $request->getParsedBody();
            if (isset($data['user']) && isset($data['pwd'])){
                $user = filter_var($data['user'], FILTER_SANITIZE_STRING);
                $pwd = filter_var($data['pwd'], FILTER_SANITIZE_STRING);
                error_log('Trying to log in user ' . $user);
                if ($db->usernameExists($user) and password_verify($pwd, $db->userPassword($user))){
                    error_log('Success!');
                    // Success!
                    $_SESSION['userid'] = $db->getUserIdByUsername($user);
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
        return $response->withHeader('Location', $this->ci->router->pathFor('home'));
    }
    
    
}