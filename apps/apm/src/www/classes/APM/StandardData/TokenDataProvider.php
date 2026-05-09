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

namespace APM\StandardData;


use APM\Core\Token\Token;

class TokenDataProvider implements StandardDataProvider
{

    const PROPERTY_TOKEN_TYPE = 'tokenType';
    const PROPERTY_TEXT = 'text';
    const PROPERTY_NORMALIZED_TEXT = 'normalizedText';
    const PROPERTY_NORMALIZATION_SOURCE = 'normalizationSource';

    /**
     * @var Token
     */
    private $token;

    public function __construct(Token $token)
    {
        $this->token = $token;
    }

    public function getStandardData(): object
    {
        $data = [
            self::PROPERTY_TOKEN_TYPE => StandardTokenType::getStandardTypeFromDbType($this->token->getType()),
            self::PROPERTY_TEXT => $this->token->getText(),
            //'tokenClass' => StandardTokenClass::BASIC  // no need to specify this since it's the default
        ];

        if ($this->token->getNormalization() !== $this->token->getText()) {
            $data[self::PROPERTY_NORMALIZED_TEXT] = $this->token->getNormalization();
            $data[self::PROPERTY_NORMALIZATION_SOURCE] = $this->token->getNormalizationSource();
        }
        return (object) $data;
    }
}