<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM;

require_once 'DatabaseTestEnvironment.php';
require_once 'SlimTwigExtensionMockup.php';
require_once 'SlimRouterMockup.php';

/**
 * Description of SiteTestEnvironment
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteTestEnvironment extends DatabaseTestEnvironment {
    
    public static function getContainer($logger) {
        $container = parent::getContainer($logger);

        $container['router'] = new \SlimRouterMockup();
        
        $view = new \Slim\Views\Twig('../templates', [
            'cache' => false
        ]);
        // Instantiate and add Slim specific extension
        $basePath = rtrim(str_ireplace('index.php', '', 
                $container['request']->getUri()->getBasePath()), '/');
        $view->addExtension(new \SlimTwigExtensionMockup(
                $container['router'], $basePath));

        $container['view'] = $view;
        
        return $container;
    }

}
