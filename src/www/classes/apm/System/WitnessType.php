<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace APM\System;


class WitnessType
{
    const FULL_TRANSCRIPTION = 'fullTx';
    const PARTIAL_TRANSCRIPTION = 'partialTx';
    const TEXT_TRANSCRIPTION_PLAIN = 'textTxPlain';
    const TEXT_TRANSCRIPTION_MARK_DOWN = 'textTxMarkdown';
    const TEXT_TRANSCRIPTION_FULL = 'textTxRich';
    const CHUNK_EDITION = 'edition';

    const SOURCE = 'source';

    static public function isValid(string $type) : bool {
        $validTypes = [
            self::FULL_TRANSCRIPTION,
            self::PARTIAL_TRANSCRIPTION,
            self::TEXT_TRANSCRIPTION_PLAIN,
            self::CHUNK_EDITION,
            self::SOURCE
        ];

        return in_array($type, $validTypes);
    }
}