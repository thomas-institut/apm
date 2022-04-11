<?php
namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

class ApiSearch extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function search(Request $request, Response $response): Response
    {
        $date = date("Y-M-d");
        $time = date("h:i:s");

        $keyword = $_POST['keyword'];
        $keyword = "'" . $keyword . "'";

        return $this->responseWithText($response,
            'Nothing found for ' . $keyword . '. Current date and time are: ' . $date . ', ' . $time . '.');
    }
}