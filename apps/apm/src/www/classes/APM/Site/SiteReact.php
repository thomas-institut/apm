<?php



namespace APM\Site;

use APM\SystemProfiler;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class SiteReact extends SiteController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function ReactMain(Request $request, Response $response): Response
    {
        SystemProfiler::setName("Site:" . __FUNCTION__);
        return $this->renderReactPage(
            $response,
            '',
            'js/ReactAPM/index.tsx'
        );
    }

}