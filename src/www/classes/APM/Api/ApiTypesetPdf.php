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

use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiTypesetPdf extends ApiController
{

    const string CLASS_NAME = 'PDF_Typesetting';

    const int API_ERROR_CANNOT_CREATE_TEMP_FILE = 5001;
    const int API_ERROR_PDF_RENDERER_ERROR = 5002;
    const string PDF_DOWNLOAD_SUBDIR = 'downloads/pdf';


    /**
     * Typesets raw typesetter data
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function generatePDF(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $inputJson = $request->getBody()->getContents();

//        if (is_null($inputJson)) {
//            $this->logger->error("$this->apiCallName: No data in request");
//            return $this->responseWithStatus($response, HttpStatus::BAD_REQUEST);
//        }

        $this->logger->debug("GeneratePDF input data size is " . strlen($inputJson) . " bytes");

        $requestId = "APM-" . hash('sha1', $inputJson);
        $this->logger->debug("GeneratePDF request id is " . $requestId);
        $inputData = json_decode($inputJson, true);
        $inputData['id'] = $requestId;
        $serviceUrl = sprintf(
                "http://%s:%s/api/typeset",
                $this->systemManager->getConfig()['typesettingService']['host'],
                $this->systemManager->getConfig()['typesettingService']['port'],
        );

        $guzzleClient = new Client([
            'base_uri' => $serviceUrl,
            'timeout'  => 10.0,
            'headers' => [ 'Content-Type' => 'application/json' ]
        ]);

        try {
            $typesettingServiceResponse = $guzzleClient->post('', ['body' => json_encode($inputData)]);
        } catch (GuzzleException $e) {
            $this->logger->error("$this->apiCallName: " . $e->getMessage());
            return $this->responseWithJson(
                $response,
                [ 'status' => 'Error', 'msg' => 'Could not contact typesetting service'],
                HttpStatus::INTERNAL_SERVER_ERROR
            );
        }

        if ($typesettingServiceResponse->getStatusCode() !== HttpStatus::SUCCESS) {
            $this->logger->error("$this->apiCallName: " . $typesettingServiceResponse->getBody());
            return $this->responseWithText(
                $response,
                "Internal Server Error: Typesetting service failed (status code {$typesettingServiceResponse->getStatusCode()})",
                HttpStatus::INTERNAL_SERVER_ERROR);
        }

        $pdfString =  $typesettingServiceResponse->getBody();
        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . $requestId . '.pdf';
        $url = $this->systemManager->getBaseUrl() . '/' . $fileToDownload;


        $this->logger->debug("$this->apiCallName: PDF generated in $url");
        if ($this->saveStringToFile($fileToDownload, $pdfString)){
            SystemProfiler::lap('Ready to send PDF');
            return $this->responseWithJson($response, [
                'status' => 'OK',
                'url' => $url,
                'typesetDocument' => [],
                'typesetterProcessingTime' => SystemProfiler::getTotalTimeInMs(),
            ]);
        } else {
           return $this->responseWithText(
               $response,
               "Internal Server Error: Could not save PDF in server",
               HttpStatus::INTERNAL_SERVER_ERROR
           );
        }
    }

    private function saveStringToFile(string $tempFileName, string $data) : bool {
        $handle = fopen($tempFileName, "w");
        if ($handle === false) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->logger->error("Cannot create file $tempFileName",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE,
                    'data' => $data ]);
            return false;
            // @codeCoverageIgnoreEnd
        }

        fwrite($handle, $data);
        fclose($handle);
        return true;
    }

    private function renderPdfFromTypesetData(array $typesetData, $pdfId = '', $useCache = true): array
    {
        $jsonData  = json_encode($typesetData);
        if ($pdfId === '') {
            $jsonDataHash = hash('sha1', $jsonData);
            $pdfId = $jsonDataHash;
        }

        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . $pdfId . '.pdf';
        $baseUrl = $this->systemManager->getBaseUrl();


        if ($useCache) {
            if (file_exists($fileToDownload)) {
                return [ 'status' => 'OK', 'cached' => true, 'url' => $baseUrl . '/' . $fileToDownload];
            }
        }

        // File is not there, do the conversion
        // 1. Create a temporary file and put the typesetter data in it
        $tempDir = $this->systemManager->getConfig()['pdfRendererTmpDir'];

        $tmpInputFileName = "$tempDir/$pdfId-renderer-input.json";
        $rendererCmdOutputFileName = "$tempDir/$pdfId-renderer-cmd_output.txt";

        if (!$this->saveStringToFile($tmpInputFileName, $jsonData)) {
            return [ 'status' => 'error', 'errorCode' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE];
        }

        $renderer = $this->systemManager->getConfig()['pdfRenderer'];
        if (isset($this->systemManager->getConfig()['pythonVenv'])) {
            $pythonVenv = $this->systemManager->getConfig()['pythonVenv'];
            $renderer = "$pythonVenv/bin/python $renderer";
        }

        $apmFullPath = $this->systemManager->getConfig()['baseFullPath'];
        $outputFileName = "$apmFullPath/$fileToDownload";

        $this->logger->debug("About to call PDF renderer '$renderer', input: $tmpInputFileName, output $outputFileName");

        $returnValue = -1;
        $returnArray = [];
        $commandLine = "$renderer $outputFileName <$tmpInputFileName";

        // run renderer
        exec($commandLine, $returnArray, $returnValue);

        $cmdLineReturn =  implode("\n", $returnArray);
        $this->logger->debug("PDF renderer returned " . strlen($cmdLineReturn) . " bytes in cmd line, saving in $rendererCmdOutputFileName");
        if (strlen($cmdLineReturn) > 0) {
            if (! $this->saveStringToFile($rendererCmdOutputFileName,$cmdLineReturn)) {
                $this->logger->error("Could not save typesetter cmd line output to $rendererCmdOutputFileName");
            }
        }
        //$this->logger->debug('PDF renderer return', $returnArray);

        if ($returnValue !== 1) {
            $this->logger->debug('PDF renderer error', [ 'array' => $returnArray, 'value' => $returnValue]);
            return [ 'status' => 'error', 'errorCode' => self::API_ERROR_PDF_RENDERER_ERROR];
        }
        return [ 'status' => 'OK', 'cached' => false,  'url' => $baseUrl . '/' . $fileToDownload];
    }


}