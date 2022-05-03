<?php
namespace APM\Api;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;


class ApiSearch extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function search(Request $request, Response $response): Response
    {
        $client = new Client();
        $url = "http://localhost:5601";
        $response = $client->request('GET', $url, ['auth' => ['admin', 'admin']]);


        $keyword = $_POST['searchText'];
        $now = TimeString::now();

        return $this->responseWithJson($response, [  'searchString' => $keyword,  'results' => [], 'serverTime' => $now]);
    }
}