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

use APM\System\ApmConfigParameter;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiPdfConversion extends ApiController
{
    const API_ERROR_CANNOT_CREATE_TEMP_FILE = 5001;
    const PDF_FILE_PREFIX = 'ApmPdf-';
    const TEMP_SVG_FILE_PREFIX = 'svg-';
    const PDF_DOWNLOAD_SUBDIR = 'downloads/pdf';

    public function convertSVGtoPDF(Request $request,  Response $response)
    {

        $apiCall = 'ConvertSVGtoPDF';
        $requiredFields = [
            'svg',
        ];

        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputData)) {
            return $inputData;
        }
        $this->profiler->start();


        $pdfId = '';
        // Check if there's a PDF Id
        if (isset($inputData['pdfId'])) {
            $pdfId = $inputData['pdfId'];
        }

        $svgHash = hash('sha256', $inputData['svg']);

        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . self::PDF_FILE_PREFIX . $pdfId . '-'. $svgHash . '.pdf';
        $baseUrl = $this->systemManager->getConfig()[ApmConfigParameter::BASE_URL];
        if (file_exists($fileToDownload)) {
            $this->codeDebug('Serving already converted file');
            $this->profiler->stop();
            $this->logProfilerData($apiCall);
            return $this->responseWithJson($response, [ 'status' => 'OK (Cached)', 'url' => $baseUrl . '/' . $fileToDownload]);
        }


        // File is not there, do the conversion

        $inkscapeExec = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_EXECUTABLE];
        $inkscapeVersion = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_VERSION];
        $tempDir = $this->systemManager->getConfig()[ApmConfigParameter::INKSCAPE_TEMP_DIR];



        // 1. Create a temporary file and put the SVG in it
        $tmpInputFileName =  $tempDir . '/' . self::TEMP_SVG_FILE_PREFIX .  $svgHash . '.svg';

        $handle = fopen($tmpInputFileName, "w");
        if ($handle === false) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->logger->error("Cannot create temporary SVG file",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE,
                    'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE], 409);
            // @codeCoverageIgnoreEnd
        }

        fwrite($handle, $inputData['svg']);
        fclose($handle);

        $this->codeDebug("About to call inkscape, input: $tmpInputFileName, output $fileToDownload");

        if ($inkscapeVersion >= 1) {
            $commandLine = "$inkscapeExec --export-filename=$fileToDownload $tmpInputFileName 2>&1";
        } else {
            $commandLine = "$inkscapeExec --export-pdf=$fileToDownload $tmpInputFileName 2>&1";
        }

        $returnValue = false;
        $returnArray = [];

        // run Inkscape
        exec($commandLine, $returnArray, $returnValue);



        $inkscapeErrors = [];
        foreach($returnArray as $returnLine) {
            if (preg_match('/Gtk-Message/', $returnLine) === false) {
                $inkscapeErrors[] = $returnLine;
            }
        }

        if (count($inkscapeErrors) !== 0) {
            // there are errors!
            $this->logger->debug('Inkscape error', [ 'array' => $returnArray, 'value' => $returnValue]);
            return $this->responseWithJson($response, ['status' => 'Errors'], 409);
        }


        $this->profiler->stop();
        $this->logProfilerData($apiCall);

        return $this->responseWithJson($response, [ 'status' => 'OK', 'url' => $baseUrl . '/' . $fileToDownload]);

    }

}