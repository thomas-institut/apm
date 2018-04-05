<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

use Slim\Views\TwigExtension;
/**
 * Description of TestTwigExtension
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SlimTwigExtensionMockup extends TwigExtension {
    
    public function pathFor($name, $data = [], $queryParams = [], $appName = 'default')
    {
        return 'PATH' . $name;
    }
    
}
