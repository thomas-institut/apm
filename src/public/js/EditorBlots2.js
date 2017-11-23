/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/* global Quill, TranscriptionEditor */

const Inline = Quill.import('blots/inline')
const BlockEmbed = Quill.import('blots/embed')
const Block = Quill.import('blots/block')

class SimpleBlockBlot extends Block 
{
  static formats()
  {
    return true
  }
 }
SimpleBlockBlot.tagName = 'p'

class HeadBlot extends SimpleBlockBlot {}

HeadBlot.blotName = 'head'
HeadBlot.className = 'headelement'
TranscriptionEditor.registerBlockBlot(HeadBlot)

class CustodesBlot extends SimpleBlockBlot{}

CustodesBlot.blotName = 'custodes'
CustodesBlot.className = 'custodes'
TranscriptionEditor.registerBlockBlot(CustodesBlot)

class PageNumberBlot extends SimpleBlockBlot{}
PageNumberBlot.blotName = 'pagenumber'
PageNumberBlot.className = 'pagenumber'
TranscriptionEditor.registerBlockBlot(PageNumberBlot)