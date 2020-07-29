<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\Api;


use Psr\Container\ContainerInterface;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiTranscription extends ApiController
{

    /**
     * @var array[]
     */
    private $fakeAvailableTranscriptions;

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);

        $this->fakeAvailableTranscriptions = [
            [ 'docId' => 4, 'dareId' => 'BOOK-DARE-M-AT-GRZ-UB-II.482', 'pages' => [ 2,4,5,6]],
            [ 'docId' => 128, 'dareId' => 'BOOK-DARE-M-AT-ADO-STB-480','pages' => [ 12,24,25,26]],
            [ 'docId' => 130, 'dareId' => 'BOOK-DARE-M-BE-LEU-KUL-1515','pages' => [ 100,101]],
            [ 'docId' => 131, 'dareId' => 'BOOK-DARE-M-FR-PAR-BNF-lat.16088','pages' => [ 4,5,6]],
            ];
    }

    public function getList(Request $request, Response $response) {
        return $this->responseWithJson($response, [
            'status' => 'FakeData',
            'list' => $this->fakeAvailableTranscriptions,
            'apiCallDateTime' => date(DATE_ATOM) ]);
    }

    public function getTranscription(Request $request, Response $response) {
        $docId = intval($request->getAttribute('docId'));
        $pageNumber = intval($request->getAttribute('page'));

        // FAKE answer for now

        if (!$this->isDocPageValid($docId, $pageNumber)) {
            return $this->responseWithJson($response, [
                [ 'error' => "Doc $docId page $pageNumber not available for download"]
            ], 409);
        }

        return $this->responseWithJson($response, [
            'docId' => $docId,
            'pageNumber' => $pageNumber,
            'status' => 'FakeData',
            'transcribers' => [ [ 'id' => 0, 'fullName' => 'Ghost Transcriber']],
            'text' =>  $this->getFakeText($docId, $pageNumber)
     ]);
    }

    private function getFakeText($docId, $page) : string {
        $loremIpsum = <<<EOT
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae 
dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, 
sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam 
est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius m
odi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, 
quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi 
consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil 
molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?
EOT;

        return "--- Doc $docId, page $page---\n$loremIpsum";
    }

    private function isDocPageValid($docId, $page) : bool {
        foreach($this->fakeAvailableTranscriptions as $availableDoc) {
            if ($docId === $availableDoc['docId']) {
                foreach($availableDoc['pages'] as $availablePage) {
                    if ($page === $availablePage) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

}