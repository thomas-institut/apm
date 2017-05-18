<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of SlimRouterMockup
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SlimRouterMockup extends Slim\Router{
    
    public function pathFor($name, array $data = [], array $queryParams = [])
    {
        return "MOCKUP_URL:" . $name;
    }
}
