<?php
/*
 *  Copyright (C) 2022-25 Universität zu Köln
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
 * Paragraph style constants used in `FmtTextMarkToken::$style` for paragraph marks.
 *
 * Mirrors the TS module `ParagraphStyle.ts`.
 */
class ParagraphStyle
{
    public const string NORMAL = '';
    public const string HEADING1 = 'h1';
    public const string HEADING2 = 'h2';
    public const string HEADING3 = 'h3';
}
