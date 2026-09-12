<?php



namespace APM\Site;

use Psr\Http\Message\ResponseInterface;
use ThomasInstitut\Profiler\SystemProfiler;
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

    protected function renderReactPage(ResponseInterface $response, string $title, string $viteEntryPoint): ResponseInterface
    {
        $baseUrl = $this->getBaseUrl();

        // all imports are handled by Vite
        [$viteJsImportsHtml, $viteCssImportsHtml] = $this->getViteImportHtml([$viteEntryPoint]);
        $html = $this->getStandardPageHtml($baseUrl, $title, $viteJsImportsHtml . $viteCssImportsHtml, '');
        $response->getBody()->write($html);
        SystemProfiler::lap('Response ready');
        $this->logger->debug(sprintf("SITE PROFILER %s Finished in %.3f ms", SystemProfiler::getName(), SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
        return $response;
    }

}