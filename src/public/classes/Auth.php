<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';

/**
 * Authentication middleware class for the web applications
 *
 * @author rafael
 */
class Auth {
    
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