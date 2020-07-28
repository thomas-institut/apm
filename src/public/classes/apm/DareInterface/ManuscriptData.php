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

/**
 * Class ManuscriptData
 *
 */
class ManuscriptData
{
    const DARE_API_BASE_URL = 'https://dare.uni-koeln.de/app/api/';

    static public function get(string $dareId) : array {
        $client = new Client([ 'base_uri' => self::DARE_API_BASE_URL, 'timeout' => 1.0]);
        $response = $client->get('db/manuscripts/' . $dareId);
        $data = json_decode($response->getBody(), true);
        // massage the data, DARE returns json into json!

        unset($data['additions']);

        $jsonFields = [ 'decoration', 'layout', 'hand_description', 'foliation', 'provenance', 'additions', 'alt_repository'];
        foreach($jsonFields as $field) {
            if (isset($data[$field]) && !is_null($data[$field])) {
                $data[$field] = json_decode($data[$field], true);
            }
        }

        foreach($data['document_items'] as $i => $item) {
            if (isset($item['note']) && !is_null($item['note'])) {
                //$data['document_items'][$i]['note'] = json_decode($item['note'], true);
                unset($data['document_items'][$i]['note']);
            }
        }

        return $data;
    }
}