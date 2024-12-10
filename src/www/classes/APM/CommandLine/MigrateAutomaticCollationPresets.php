<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\CommandLine;


use APM\Presets\Preset;
use APM\System\PresetFactory;
use APM\System\SystemManager;

class MigrateAutomaticCollationPresets extends CommandLineUtility
{

    public function main($argc, $argv)
    {
        $this->logger->debug("Starting preset Migration");
        $presetManager = $this->getSystemManager()->getPresetsManager();

        $presets = $presetManager->getPresetsByToolAndKeys(SystemManager::TOOL_AUTOMATIC_COLLATION_V1, []);
        $presetFactory = new PresetFactory();

        foreach($presets as $preset) {
            /** @var Preset $preset */
            print "Processing preset id " . $preset->getId() . '... ';

            $witnesses = $preset->getData()['witnesses'];
            $hasOldVersionIds = false;
            foreach ($witnesses as $witness) {
                if (is_int($witness)) {
                    $hasOldVersionIds = true;
                    break;
                }
            }

            if (!$hasOldVersionIds) {
                print " already with new style ids... ";
            }

            print " migrating...";

            $newWitnesses = [];
            foreach($witnesses as $witnessId) {
                if (is_int($witnessId)) {
                    $newWitnesses[] = 'fullTx-' . $witnessId . '-A';
                } else {
                    $newWitnesses[] = $witnessId;
                }
            }
            $newData = $preset->getData();
            $newData['witnesses'] = $newWitnesses;
            $newPreset = $presetFactory->create(SystemManager::TOOL_AUTOMATIC_COLLATION, $preset->getUserId(), $preset->getTitle(), $newData);

            if ($presetManager->addPreset($newPreset)) {
                print " done\n";

            } else {
                print " migrated preset already in database\n";
            }
        }
        $this->logger->info('Finished migrating preset to ' . SystemManager::TOOL_AUTOMATIC_COLLATION);
    }
}