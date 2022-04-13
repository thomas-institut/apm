#!/usr/bin/env python3

#
# Renders an array of pages
# Expects a json string in stdin
#
#  pdf-renderer [-o fileNamePrefix] -
#

import sys
import json
import cairo
import gi

gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango
from gi.repository import PangoCairo

HORIZONTAL = 0
VERTICAL = 1
file_name_prefix = 'test'


def px2pt(px):
    return px * 3 / 4


def print_item_list(context, x, y, the_list_item):
    tmp_x = x + px2pt(the_list_item['shiftX'])
    tmp_y = y + px2pt(the_list_item['shiftY'])
    for item in the_list_item['list']:
        if item['class'] == 'List':
            print_item_list(context, tmp_x, tmp_y, item)
        elif item['class'] == 'TextBox':
            print_text_box(context, tmp_x, tmp_y, item)
        if the_list_item['direction'] == HORIZONTAL:
            tmp_x += px2pt(item['width'])
        else:
            tmp_y += px2pt(item['height'])


def print_text_box(context, x, y, text_box):
    layout = PangoCairo.create_layout(context)
    desc = Pango.FontDescription()
    desc.set_family(text_box['fontFamily'])
    desc.set_absolute_size(px2pt(text_box['fontSize'])*Pango.SCALE)
    layout.set_font_description(desc)
    layout.set_text(text_box['text'])
    context.move_to(x + px2pt(text_box['shiftX']), y + px2pt(text_box['shiftY']))
    context.set_source_rgb(0, 0, 0)
    PangoCairo.show_layout(context, layout)


input_str = sys.stdin.read()
doc = json.loads(input_str)

surface_pdf = cairo.PDFSurface(file_name_prefix + '.pdf', px2pt(doc['width']), px2pt(doc['height']))
ctx_pdf = cairo.Context(surface_pdf)

for page in doc['pages']:
    surface_pdf.set_size(px2pt(page['width']), px2pt(page['height']))
    for item_list in page['lists']:
        print_item_list(ctx_pdf, 0, 0, item_list)
    ctx_pdf.show_page()

