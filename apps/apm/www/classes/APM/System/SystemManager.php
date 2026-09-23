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


namespace APM\System;


use APM\CollationEngine\CollationEngine;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

/**
 * Integration class for putting together all the elements necessary
 * to build and operate the APM system.
 *
 * Components such as API, Site and CLI controllers should,
 * ideally, only depend on this class. This makes it possible to implement specific managers
 * for different contexts: full web application, testing, etc.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class SystemManager implements ErrorReporter
{

    use SimpleErrorReporterTrait;

    /**
     * @var array
     * @deprecated Use ApmSystemConfig from the container
     */
    protected array $config;

    protected ContainerInterface $ci;


    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->resetError();
        $this->ci = $ci;
        $this->config = $ci->get(ApmContainerKey::CONFIG_ARRAY);
    }

    /**
     * @return array
     * @deprecated Use ApmSystemConfig from the container
     */
    public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Get methods for the different components
     */

    abstract public function getImageSources(): array;

    abstract public function getCollationEngine(string $engineSystemId = ''): CollationEngine;

}
