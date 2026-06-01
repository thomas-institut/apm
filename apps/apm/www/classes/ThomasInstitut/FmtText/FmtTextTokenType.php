<?php
/*
 *  Copyright (C) 2021-25 Universität zu Köln
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

namespace ThomasInstitut\FmtText;

/**
 * String constants identifying the type of a FmtText token.
 *
 * Mirrors the TS module `FmtTextTokenType.ts`.
 */
class FmtTextTokenType
{
    public const string EMPTY = 'empty';
    public const string TEXT = 'text';
    public const string GLUE = 'glue';
    public const string MARK = 'mark';
}
