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

use InvalidArgumentException;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use Slim\Interfaces\RouteParserInterface;

/**
 * Description of SlimRouterMockup
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SlimRouterMockup implements RouteParserInterface {
    
    public function urlFor(string $routeName, array $data = [], array $queryParams = []) : string
    {
        return "MOCKUP_URL:" . $routeName;
    }

    /**
     * Build the path for a named route excluding the base path
     *
     *
     * @param string $routeName Route name
     * @param array $data Named argument replacement data
     * @param array $queryParams Optional query string parameters
     *
     * @return string
     *
     * @throws RuntimeException         If named route does not exist
     * @throws InvalidArgumentException If required data not provided
     */
    public function relativeUrlFor(string $routeName, array $data = [], array $queryParams = []): string
    {
        return "MOCKUP_URL:" . $routeName;
    }

    /**
     * Get fully qualified URL for named route
     *
     * @param UriInterface $uri
     * @param string $routeName Route name
     * @param array $data Named argument replacement data
     * @param array $queryParams Optional query string parameters
     *
     * @return string
     */
    public function fullUrlFor(UriInterface $uri, string $routeName, array $data = [], array $queryParams = []): string
    {
        return "MOCKUP_FULL_URL:" . $routeName;
    }
}
