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

use APM\Api\DataSchema\ApiTypesetPdfResponse;
use APM\NodeService\CouldNotContactServiceException;
use APM\NodeService\InvalidNodeServiceResponseException;
use APM\NodeService\NodeServiceClient;
use APM\NodeService\NodeServiceFailedException;
use APM\ToolBox\HttpStatus;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\Profiler\SystemProfiler;

class ApiTypesetPdf extends ApiController
{

    const string CLASS_NAME = 'ApiTypesetPdf';

    const int API_ERROR_CANNOT_CREATE_TEMP_FILE = 5001;
    const string PDF_DOWNLOAD_SUBDIR = 'downloads/pdf';

    /**
     * Minimum valid PDF file size in bytes; if a PDF file is smaller than this, it is not considered valid and
     * will not be returned or cached.
     */
    const int MIN_VALID_PDF_FILE_SIZE = 2048;


    /**
     * Typesets raw typesetter data
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function toPdf(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $inputJson = $request->getBody()->getContents();
        $useCacheParam = $request->getAttribute('useCache', 'true');
        $useCache = $useCacheParam === 'true' || $useCacheParam === '1' || $useCacheParam === true;
        $this->logger->debug("GeneratePDF input data size is " . strlen($inputJson) . " bytes. Use cache " . ($useCache ? 'true' : 'false') . " ", [substr($inputJson, 0, 50)]);

        $requestId = "APM-" . hash('sha256', $inputJson);
        $this->logger->debug("GeneratePDF request id is " . $requestId);
        $fileToDownload = self::PDF_DOWNLOAD_SUBDIR . '/' . $requestId . '.pdf';
        $url = $this->systemManager->getBaseUrl() . '/' . $fileToDownload;

        if ($useCache) {
            if (file_exists($fileToDownload) && filesize($fileToDownload) > self::MIN_VALID_PDF_FILE_SIZE) {
                $this->logger->debug("GeneratePDF: PDF already exists in cache, returning it");
                $data = new ApiTypesetPdfResponse();
                  $data->url = $url;
                $data->cached = true;
                $data->typesetterProcessingTime = SystemProfiler::getTotalTimeInMs();
                return $this->responseFactory->success($response, $data);
            }
        }

        $inputData = json_decode($inputJson, true);
        $inputData['id'] = $requestId;

        try {
            /** @var NodeServiceClient $nodeServiceClient */
            $nodeServiceClient = $this->container->get(NodeServiceClient::class);
            $pdfString = $nodeServiceClient->generatePdf($inputData);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("$this->apiCallName: " . $e->getMessage());
            return $this->responseFactory->internalServerError($response, 'Configuration error: node service client not available');
        } catch (CouldNotContactServiceException|NodeServiceFailedException|InvalidNodeServiceResponseException $e) {
            $this->logger->error("$this->apiCallName: " . $e->getMessage());
            return $this->responseFactory->internalServerError($response, 'Node service error');
        }


//        $serviceUrl = sprintf(
//                "http://%s:%s/api/typeset",
//                $this->systemManager->getConfig()['typesettingService']['host'],
//                $this->systemManager->getConfig()['typesettingService']['port'],
//        );
//
//        $guzzleClient = new Client([
//            'base_uri' => $serviceUrl,
//            'timeout'  => $this->systemManager->getConfig()['apiTypesetPdfHttpClientTimeOut'],
//            'headers' => [ 'Content-Type' => 'application/json' ]
//        ]);
//
//        try {
//            $typesettingServiceResponse = $guzzleClient->post('', ['body' => json_encode($inputData)]);
//        } catch (GuzzleException $e) {
//            $this->logger->error("$this->apiCallName: " . $e->getMessage());
//            return $this->responseFactory->internalServerError($response, 'Could not contact typesetting service');
//        }
//
//        if ($typesettingServiceResponse->getStatusCode() !== HttpStatus::SUCCESS) {
//            $this->logger->error("$this->apiCallName: Typesetting service failed with code " . $typesettingServiceResponse->getBody());
//            return $this->responseFactory->internalServerError($response, "Typesetting service failed");
//        }
//
//        $pdfString =  $typesettingServiceResponse->getBody();
//
//        if (strlen($pdfString) < self::MIN_VALID_PDF_FILE_SIZE) {
//            $this->logger->error("$this->apiCallName: Typesetting service returned empty or very small PDF");
//            return $this->responseFactory->internalServerError($response, "Typesetting service returned invalid PDF");
//        }

        $this->logger->debug("$this->apiCallName: PDF generated in $url");
        if ($this->saveStringToFile($fileToDownload, $pdfString)){
            SystemProfiler::lap('Ready to send PDF');
            $data = new ApiTypesetPdfResponse();
            $data->url = $url;
            $data->cached = false;
            $data->typesetterProcessingTime = SystemProfiler::getTotalTimeInMs();
            return $this->responseFactory->success($response, $data);
        }
        $this->logger->error("$this->apiCallName: Could not save PDF in server");
        unlink($fileToDownload);
        return $this->responseFactory->internalServerError($response, "Could not save PDF in server");
    }

    private function saveStringToFile(string $tempFileName, string $data) : bool {
        $handle = fopen($tempFileName, "w");
        if ($handle === false) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->logger->error("Cannot create file $tempFileName",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => self::API_ERROR_CANNOT_CREATE_TEMP_FILE,
                    'data' => $data ]);
            return false;
            // @codeCoverageIgnoreEnd
        }

        fwrite($handle, $data);
        fclose($handle);
        return true;
    }


}