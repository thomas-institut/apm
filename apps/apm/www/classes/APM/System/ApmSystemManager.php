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

use APM\CollationEngine\CollatexHttp;
use APM\CollationEngine\CollationEngine;
use APM\CollationEngine\DoNothingCollationEngine;
use APM\EntitySystem\Schema\Entity;
use APM\System\Config\ApmSystemConfig;
use APM\System\ImageSource\BilderbergImageSource;
use APM\System\ImageSource\OldBilderbergStyleRepository;
use APM\ToolBox\Resettable;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use RuntimeException;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;


/**
 * This is the "production" implementation of SystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager
{
    private array $imageSources;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci, private readonly ApmSystemConfig $systemConfig)
    {
        parent::__construct($ci);

        $this->imageSources = [
            Entity::ImageSourceBilderberg => new BilderbergImageSource($this->systemConfig->url->bilderberg),
            Entity::ImageSourceAverroesServer => new OldBilderbergStyleRepository($this->systemConfig->url->localImageRepository)
        ];
    }


    public function getPdoProvider(): PdoProvider
    {
        try {
            return $this->ci->get(PdoProvider::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('Could not get PDO provider from container: ' . $e->getMessage(), $e->getCode(), $e);
        }
    }


    /**
     * Resets the database connection and all cached managers that depend on it.
     *
     * This forces later getter calls to recreate the connection and related managers.
     * @return void
     */
    public function resetDbConnectionAndDependentManagers(): void
    {
        $provider = $this->getPdoProvider();

        if ($provider instanceof Resettable) {
            $provider->reset();
        }
    }

    public function getImageSources(): array
    {
        return $this->imageSources;
    }

    public function getCollationEngine(string $engineSystemId = ''): CollationEngine
    {
        if ($engineSystemId === ApmCollationEngine::DO_NOTHING) {
            return new DoNothingCollationEngine();
        }
        try {
            return $this->ci->get(CollatexHttp::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('CollatexHttp collation engine not found in container', 0, $e);
        }
    }

}
