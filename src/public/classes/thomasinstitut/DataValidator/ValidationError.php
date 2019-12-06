<?php
/* 
 *  Copyright (C) 2019 Universität zu Köln
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

namespace ThomasInstitut\DataValidator;


class ValidationError
{
    const NO_ERROR = 0;
    const DATA_MUST_NOT_BE_EMPTY = 101;
    const DATA_MUST_BE_STRING = 102;
    const DATA_MUST_BE_INTEGER = 103;
    const DATA_MUST_BE_FLOAT = 104;
    const DATA_MUST_BE_ARRAY = 105;

}