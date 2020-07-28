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

namespace  APM\DareInterface;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ServerException;

/**
 * Class ManuscriptData
 *
 */
class DareMssMetadataSource implements ManuscriptMetadataSource
{
    /**
     * @var string
     */
    private $apiBaseUri;

    public function __construct(string $apiBaseUri)
    {
        $this->apiBaseUri = $apiBaseUri;

    }

    public function getMetadata(string $dareId) : array {
        $metaData = [];
        $metaData['serverResponse'] = 'OK';
        $client = new Client([ 'base_uri' => $this->apiBaseUri, 'timeout' => 1.0]);
        try {
            $response = $client->get('manuscripts/' . $dareId);
        } catch(ServerException $exception) {
            $metaData['serverResponse'] = 'Server Error ' . $exception->getCode();
            return $metaData;
        }


        $dareData = json_decode($response->getBody(), true);
        // pick and choose the data, DARE returns a mess!

        $fieldsToCopy = [ 'leaves_count', 'binding_date', 'origin_not_before', 'origin_not_after', 'origin_date', 'origin_place'];
        foreach($fieldsToCopy as $field) {
            if(isset($dareData[$field])) {
                $metaData[$field] = $dareData[$field];
            }
        }

        if (isset($dareData['pages'])) {
            $metaData['pageCount'] = count($dareData['pages']);
            foreach($dareData['pages'] as $darePage) {
                $metaData['pages'][] = [
                    'pageNumber' => intval($darePage['page_number']),
                    'seqNumber' => intval($darePage['sequence_number']),
                    'folio' => $darePage['main_folio'],
                    'bilderbergId' => $darePage['bilderberg_id']
                ];
            }
        }

        return $metaData;
    }
}