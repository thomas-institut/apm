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

if len(sys.argv) != 2:
    print("Need an out file name")
    exit(0)

output_file_name = sys.argv[1]


def px2pt(px):
    return px * 3 / 4


def get_value(var, key, default_value):
    if key in var.keys():
        return var[key]
    return default_value


def print_item(context, x, y, the_item):
    if the_item['class'] == 'ItemList':
        print_item_list(context, x, y, the_item)
    elif the_item['class'] == 'TextBox':
        print_text_box(context, x, y, the_item)


def print_item_list(context, x, y, the_list_item):
    tmp_x = x + px2pt(get_value(the_list_item, 'shiftX', 0))
    tmp_y = y + px2pt(get_value(the_list_item, 'shiftY', 0))

    for some_item in the_list_item['list']:
        print_item(context, tmp_x, tmp_y, some_item)
        if the_list_item['direction'] == HORIZONTAL:
            tmp_x += px2pt(some_item['width'])
        else:
            tmp_y += px2pt(some_item['height'])


def print_text_box(context, x, y, text_box):
    shift_x = px2pt(get_value(text_box, 'shiftX', 0))
    shift_y = px2pt(get_value(text_box, 'shiftY', 0))
    layout = PangoCairo.create_layout(context)
    desc = Pango.FontDescription()
    desc.set_family(text_box['fontFamily'])
    desc.set_absolute_size(px2pt(text_box['fontSize'])*Pango.SCALE)
    font_weight = get_value(text_box, 'fontWeight', '')
    if font_weight == 'bold':
        desc.set_weight(Pango.Weight.BOLD)

    font_style = get_value(text_box, 'fontStyle', '')
    if font_style == 'italic':
        desc.set_style(Pango.Style.ITALIC)
    layout.set_font_description(desc)
    layout.set_text(text_box['text'])
    context.move_to(x + shift_x, y + shift_y)
    context.set_source_rgb(0, 0, 0)
    PangoCairo.show_layout(context, layout)


input_str = sys.stdin.read()
doc = json.loads(input_str)

surface_pdf = cairo.PDFSurface(output_file_name, px2pt(doc['width']), px2pt(doc['height']))
ctx_pdf = cairo.Context(surface_pdf)

for page in doc['pages']:
    surface_pdf.set_size(px2pt(page['width']), px2pt(page['height']))
    for item in page['items']:
        print_item(ctx_pdf, 0, 0, item)
    ctx_pdf.show_page()

exit(1)
