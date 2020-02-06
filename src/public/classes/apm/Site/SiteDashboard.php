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

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


/**
 * Site Controller class
 *
 */
class SiteDashboard extends SiteController
{

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
        $docIds = $dataManager->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }

        $this->profiler->stop();
        $this->logProfilerData('dashboardPage-' . $this->userInfo['username'] . '-' . $userId);

        return $this->renderPage($response, 'dashboard.twig', [
            'doclist' => $docListHtml
        ]);
    }
}