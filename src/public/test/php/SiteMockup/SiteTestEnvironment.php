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

namespace APM;

use APM\System\ApmContainerKey;
use Slim\Views\Twig;

require_once 'DatabaseTestEnvironment.php';
require_once 'SlimTwigExtensionMockup.php';
require_once 'SlimRouterMockup.php';

/**
 * Description of SiteTestEnvironment
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteTestEnvironment extends DatabaseTestEnvironment {
    
    public function getContainer() {
        $container = parent::getContainer();

        $container->set(ApmContainerKey::ROUTER,  new SlimRouterMockup());

        $view =  new Twig('../../templates', ['cache' => false]);
        $view->addExtension(new SlimTwigExtensionMockup());

        $container->set(ApmContainerKey::VIEW, $view);
        return $container;
    }

}
