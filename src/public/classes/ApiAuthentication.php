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
 * Authentication Middleware class for the API
 *
 * @author rafael
 */
class ApiAuthentication {
    protected $ci;
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
   }
   
   public function __invoke(Request $request, Response $response, $next) {
       // Nothing here for the moment!
       error_log('API Auth: letting all through!');
       return $next($request, $response); 
   }
}
