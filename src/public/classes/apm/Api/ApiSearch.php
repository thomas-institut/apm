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

       /* if (isset($_POST["#searchField"])) {
            var_dump($_POST["#searchField"]); // $_POST['txt'] contains the text from the input field
            // TODO: make your treatment here...
        } */

        return $this->responseWithText($response, 'Hello!');
    }
}