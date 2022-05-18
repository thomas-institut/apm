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
class SiteApmLog extends SiteController
{

    const TEMPLATE= 'apm-log.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function apmLogPage(Request $request, Response $response): Response
    {
        $userId = $this->userInfo['id'];
        if (!$this->dataManager->userManager->isUserAllowedTo($userId, 'view-system-log')) {
            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
                'message' => 'You are not allowed to access the requested page']);
        }
        return $this->renderPage($response, self::TEMPLATE, []);
    }
}
