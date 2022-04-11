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
        $apiCall = 'search';
        $date = date("Y-M-d");
        $time = date("h:i:s");

        // $input = $this->checkAndGetInputData($request, $response, $apiCall, ['text']);
        $input = $_POST['input'];
        $input = "'" . $input . "'";

        return $this->responseWithText($response,
            'Nothing found for ' . $input . '. Current date and time are: ' . $date . ', ' . $time . '.');
    }
}