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

use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiTypesetPdf extends ApiController
{

    const string CLASS_NAME = 'PDF_Typesetting';

    const int API_ERROR_CANNOT_CREATE_TEMP_FILE = 5001;
    const int API_ERROR_PDF_RENDERER_ERROR = 5002;
    const int API_TYPESETTER_ERROR = 5003;
    const string PDF_FILE_PREFIX = 'ApmPdf-';
    const string PDF_DOWNLOAD_SUBDIR = 'downloads/pdf';


    /**
     * Typesets raw typesetter data
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function typesetRawData(Request  $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $requiredFields = [
            'jsonData',
        ];
        // jsonData should parse into an object with two fields: options and mainTextList,
        // but it's no use checking it here when the node js app will do it and
        // generate an error if there's any problem

//        $inputData = $this->checkAndGetInputData($request, $response, $requiredFields);
//        if (!is_array($inputData)) {
//            return $inputData;
//        }

        $inputData = $request->getParsedBody()['jsonData'] ?? null;

        if (is_null($inputData)) {
            $this->logger->error("$this->apiCallName: No data in request");
            return $this->responseWithStatus($response, HttpStatus::BAD_REQUEST);
        }

        $this->codeDebug('Json data', [ 'length' => strlen($inputData) ]);

        $jsonDataHash = hash('sha256', $inputData);
        $tempDir = $this->systemManager->getConfig()['pdfRendererTmpDir'];
        $tempTypesetterInputFileName = "$tempDir/$jsonDataHash-ts-input.json";
        $tempTypesetterOutputFileName = "$tempDir/$jsonDataHash-ts-output.json";
        $tempTypesetterCmdLineOutputFileName = "$tempDir/$jsonDataHash-ts-cmd_output.txt";

        if (! $this->saveStringToFile($tempTypesetterInputFileName, $inputData)) {
            $errorData = [ 'status' => 'Error', 'error' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE];
            return $this->responseWithJson($response, $errorData, HttpStatus::INTERNAL_SERVER_ERROR);
        }

        $typesetter = $this->systemManager->getConfig()['typeSetter'];


        $this->codeDebug("About to call typesetter, input: $tempTypesetterInputFileName, output $tempTypesetterOutputFileName");

        $returnValue = -1;
        $returnArray = [];
        $commandLine = "$typesetter $tempTypesetterOutputFileName <$tempTypesetterInputFileName";

        // run typesetter
        exec($commandLine, $returnArray, $returnValue);
        $cmdLineReturn =  implode("\n", $returnArray);
        $this->logger->debug("Typesetter returned " . strlen($cmdLineReturn) . " bytes in cmd line, saving in $tempTypesetterCmdLineOutputFileName");

        if (! $this->saveStringToFile($tempTypesetterCmdLineOutputFileName,$cmdLineReturn)) {
            $this->logger->error("Could not save typesetter cmd line output to $tempTypesetterCmdLineOutputFileName");
        }

        if ($returnValue !== 1) {
            $this->logger->debug('Typesetter error', [ 'array' => $returnArray, 'value' => $returnValue]);
            $errorData =  [ 'status' => 'Error', 'error' => self::API_TYPESETTER_ERROR];
            return $this->responseWithJson($response, $errorData, HttpStatus::INTERNAL_SERVER_ERROR);
        }
        $typesetterReturnData = [];
        try {
            $typesetterReturnData = json_decode($returnArray[0], true);
        } catch (Exception) {
            $this->logger->debug("Bad Json returned by typesetter", [ 'array' => $returnArray, 'value' => $returnValue]);
        }
        $typesetterDuration = -1;
        if (isset($typesetterReturnData['stats']['processingTime'])) {
            $typesetterDuration = $typesetterReturnData['stats']['processingTime'];
        }

        $typesetData = file_get_contents($tempTypesetterOutputFileName);

        $result = $this->renderPdfFromJsonData($typesetData, $jsonDataHash, false);
//        $totalProcessingTime = $this->getProfilerTotalTime() * 1000;
        if ($result['status'] === 'error') {
            return $this->responseWithJson($response, ['error' => $result['error'] ?? 'No error reported'], 409);
        }
        return $this->responseWithJson($response, [
            'status' => 'OK',
            'cached' => $result['cached'],
            'url' => $result['url'],
            'typesetDocument' => json_decode($typesetData, true),
            'typesetterProcessingTime' => $typesetterDuration,
//            'pdfRenderingTime' => $totalProcessingTime - $typesetterDuration,
//            'totalProcessingTime' => $totalProcessingTime
        ]);
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

    private function renderPdfFromJsonData($jsonData, $pdfId = '', $useCache = true): array
    {
        $jsonDataHash = hash('sha256', $jsonData);
        if ($pdfId === '') {
            $pdfId = $jsonDataHash;
        }

        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . self::PDF_FILE_PREFIX . $pdfId . '.pdf';
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

//    public function convertTypesetterDataToPdf(Request  $request, Response $response): Response
//    {
//        $apiCall = 'ConvertTypesetterDataToPDF';
//        $requiredFields = [
//            'typesetterData',
//        ];
//
//        $inputData = $this->checkAndGetInputData($request, $response, $requiredFields);
//        if (!is_array($inputData)) {
//            return $inputData;
//        }
//        
//
//        $pdfId = '';
//        // Check if there's a PDF Id
//        if (isset($inputData['pdfId'])) {
//            $pdfId = $inputData['pdfId'];
//        }
//
//        $useCache = true;
//
//        if (isset($inputData['noCache'])) {
//            $useCache = false;
//        }
//
//        $result = $this->renderPdfFromJsonData($inputData['typesetterData'], $pdfId, $useCache);
//        if ($result['status'] === 'error') {
//            return $this->responseWithJson($response, ['error' => $result['errorCode']], 409);
//        }
//        return $this->responseWithJson($response, [
//            'status' =>  'OK',
//            'cached'=> $result['cached'],
//            'url' => $result['url']
//        ]);
//    }
//
//    public function convertSVGtoPDF(Request $request,  Response $response): Response
//    {
//        // TODO: Check if this is actually used right now
//        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
//        $requiredFields = [
//            'svg',
//        ];
//
//        $inputData = $this->checkAndGetInputData($request, $response, $requiredFields);
//        if (!is_array($inputData)) {
//            return $inputData;
//        }
//        
//
//
//        $pdfId = '';
//        // Check if there's a PDF Id
//        if (isset($inputData['pdfId'])) {
//            $pdfId = $inputData['pdfId'];
//        }
//
//        $svgHash = hash('sha256', $inputData['svg']);
//
//        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . self::PDF_FILE_PREFIX . $pdfId . '-'. $svgHash . '.pdf';
//        $baseUrl = $this->systemManager->getBaseUrl();
//        if (file_exists($fileToDownload)) {
//            $this->codeDebug('Serving already converted file');
//            return $this->responseWithJson($response, [ 'status' => 'OK (Cached)', 'url' => $baseUrl . '/' . $fileToDownload]);
//        }
//
//
//        // File is not there, do the conversion
//
//        $inkscapeExec = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_EXECUTABLE];
//        $inkscapeVersion = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_VERSION];
//        $tempDir = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_TEMP_DIR];
//        $apmFullPath = $this->systemManager->getConfig()[ApmConfigParameter::BASE_FULL_PATH];
//
//        // 1. Create a temporary file and put the SVG in it
//        $tmpInputFileName =  $tempDir . '/' . self::TEMP_SVG_FILE_PREFIX .  $svgHash . '.svg';
//        $outputFileName = "$apmFullPath/$fileToDownload";
//
//        $handle = fopen($tmpInputFileName, "w");
//        if ($handle === false) {
//            // Cannot reproduce this condition in testing
//            // @codeCoverageIgnoreStart
//            $this->logger->error("Cannot create temporary SVG file",
//                [ 'apiUserId' => $this->apiUserId,
//                    'apiError' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE,
//                    'data' => $inputData ]);
//            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE], 409);
//            // @codeCoverageIgnoreEnd
//        }
//
//        fwrite($handle, $inputData['svg']);
//        fclose($handle);
//
//        $this->codeDebug("About to call inkscape, input: $tmpInputFileName, output $outputFileName");
//
//        if ($inkscapeVersion >= 1) {
//            $commandLine = "$inkscapeExec --export-filename=$outputFileName $tmpInputFileName 2>&1";
//        } else {
//            $commandLine = "$inkscapeExec --export-pdf=$outputFileName $tmpInputFileName 2>&1";
//        }
//
//        $returnValue = false;
//        $returnArray = [];
//
//        // run Inkscape
//        exec($commandLine, $returnArray, $returnValue);
//
//
//        $this->logger->debug('Inkscape return', $returnArray);
//
//        $inkscapeErrors = [];
//        foreach($returnArray as $returnLine) {
//            if (preg_match('/Gtk-Message/', $returnLine) === false) {
//                $inkscapeErrors[] = $returnLine;
//            }
//        }
//
//        if (count($inkscapeErrors) !== 0) {
//            // there are errors!
//            $this->logger->debug('Inkscape error', [ 'array' => $returnArray, 'value' => $returnValue]);
//            return $this->responseWithJson($response, ['status' => 'Errors'], 409);
//        }
//
//        return $this->responseWithJson($response, [ 'status' => 'OK', 'url' => $baseUrl . '/' . $fileToDownload]);
//
//    }

}