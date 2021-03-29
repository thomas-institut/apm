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

require_once 'MockTranscriptionManager.php';
require_once 'MockNormalizerManager.php';

use APM\CollationEngine\CollationEngine;
use APM\CollationEngine\DoNothingCollationEngine;
use APM\CollationEngine\NullCollationEngine;
use APM\CollationTable\ApmCollationTableManager;
use APM\CollationTable\ApmCollationTableVersionManager;
use APM\CollationTable\CollationTableManager;
use APM\Core\Token\Normalizer\MockNormalizerManager;
use APM\FullTranscription\TranscriptionManager;
use APM\Presets\DataTablePresetManager;
use APM\Presets\PresetManager;
use APM\System\ApmConfigParameter;
use APM\System\NormalizerManager;
use APM\System\SystemManager;
use APM\System\SettingsManager;
use APM\Plugin\HookManager;
use MockCollationTableManager;
use Slim\Interfaces\RouteParserInterface;
use Slim\Views\Twig;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataTable\InMemoryDataTable;
use MockTranscriptionManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
/**
 * Description of SystemManagerMockup
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SystemManagerMockup extends SystemManager {
    
    private $logger;
    private $hm;
    private $sm;
    private $pm;
    /**
     * @var Twig
     */
    private $twig;

    /**
     * @var MockTranscriptionManager
     */
    private $tm;
    /**
     * @var MockCollationTableManager
     */
    private $ctm;

    /**
     * @var RouteParserInterface
     */
    private $router;

    public function __construct() {
        parent::__construct([]);
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('SM_MOCKUP');
        $logger->pushHandler($logStream);
        
        $this->logger = $logger;
        
        $this->hm = new HookManager();
        $this->sm = new SettingsManager();
        $this->pm = new DataTablePresetManager(new InMemoryDataTable());
        $this->tm = new MockTranscriptionManager();
        $this->ctm = new MockCollationTableManager();

    }
    
    public function checkSystemSetup() {
        return true;
    }

    public function getLogger() : Logger {
        return $this->logger;
    }

    public function getPresetsManager() : PresetManager {
        return $this->pm;
    }

    public function setUpSystem() {
        return true;
    }
    
    public function getHookManager() : HookManager {
        return $this->hm;
    }

    public function getSettingsManager() : SettingsManager {
        return $this->sm;
    }

    public function getCollationEngine() : CollationEngine
    {
        return new DoNothingCollationEngine();
    }

    public function getTranscriptionManager(): TranscriptionManager
    {
        return $this->tm;
    }

    public function getSystemDataCache(): DataCache
    {
        return new InMemoryDataCache();
    }

    public function getCollationTableManager(): CollationTableManager
    {
        return $this->ctm;
    }

    public function getBaseUrl(): string
    {
        return "http://test";
    }

    public function setRouter(RouteParserInterface $router): void
    {
        $this->router = $router;
    }

    public function getRouter(): RouteParserInterface
    {
        return $this->router;
    }

    public function getTwig(): Twig
    {

        if (is_null($this->twig)) {
            $this->twig = new Twig($this->config[ApmConfigParameter::TWIG_TEMPLATE_DIR],
                ['cache' => $this->config[ApmConfigParameter::TWIG_USE_CACHE]]);
        }
        return $this->twig;
    }


    public function getNormalizerManager(): NormalizerManager
    {
        return new MockNormalizerManager();
    }
}
