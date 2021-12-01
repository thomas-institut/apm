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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


/**
 * Site Controller class
 *
 */
class SiteDashboard extends SiteController
{

    const TEMPLATE_DASHBOARD = 'dashboard.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function dashboardPage(Request $request, Response $response)
    {
        
        $dataManager = $this->dataManager;
        $userId = (int) $this->userInfo['id'];

        $this->profiler->start();

        $this->manageCookies($request);
        $docIds = $dataManager->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }

        $ctManager = $this->systemManager->getCollationTableManager();
        $tableIds = $ctManager->getCollationTableVersionManager()->getActiveCollationTableIdsForUserId($userId);
        $tableInfo = [];
        foreach($tableIds as $tableId) {
            try {
                $ctData = $ctManager->getCollationTableById($tableId);
            } catch(InvalidArgumentException $e) {
                $this->logger->error("Table $tableId reported as being active does not exist. Is version table consistent?");
                continue;
            }
            if ($ctData['archived']) {
                continue;
            }
            $chunkId = isset($ctData['chunkId']) ? $ctData['chunkId'] : $ctData['witnesses'][0]['chunkId'];

            $tableInfo[] = [
                'id' => $tableId,
                'title' => $ctData['title'],
                'type' => $ctData['type'],
                'chunkId' => $chunkId,
            ];
        }


        $this->profiler->stop();
        $this->logProfilerData('dashboardPage-' . $this->userInfo['username'] . '-' . $userId);

        return $this->renderPage($response, self::TEMPLATE_DASHBOARD, [
            'doclist' => $docListHtml,
            'tableInfo' => $tableInfo,
            'isRoot' => $this->userInfo['isRoot']
        ]);
    }
}
