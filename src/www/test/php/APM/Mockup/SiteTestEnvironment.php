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

namespace Test\APM\Mockup;

use APM\System\ApmContainerKey;
use APM\System\SystemManager;

/**
 * Description of SiteTestEnvironment
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SiteTestEnvironment extends DatabaseTestEnvironment {

    /**
     * @var bool
     */
    private bool $routerSetup;
    /**
     * @var bool
     */
    private $twigExtensionSetup;

    public function __construct($apmTestConfig)
    {
        parent::__construct($apmTestConfig);
        $this->routerSetup = false;
        $this->twigExtensionSetup = false;
    }

    public function getContainer() {
        $container = parent::getContainer();

        /** @var SystemManager $systemManager */
        $systemManager = $container->get(ApmContainerKey::SYSTEM_MANAGER);
        if (!$this->routerSetup) {
            $systemManager->setRouter( new SlimRouterMockup());
            $this->routerSetup = true;
        }

        if (!$this->twigExtensionSetup) {
            $view =  $systemManager->getTwig();
            $view->addExtension(new SlimTwigExtensionMockup());
            $this->twigExtensionSetup = true;
        }
        return $container;
    }

}
