<?php
namespace APM\Api;

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
//        $date = date("Y-M-d");
//        $time = date("h:i:s");

        $keyword = $_POST['searchText'];
//        $keyword = "'" . $keyword . "'";
        $now = TimeString::now();

//        return $this->responseWithText($response,
//            'Nothing found for ' . $keyword . ". " . 'Time is now: ' . $date . ', ' . $time . '.');

        return $this->responseWithJson($response, [  'searchString' => $keyword,  'results' => [], 'serverTime' => $now]);
    }
}