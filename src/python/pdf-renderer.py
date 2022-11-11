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
debug = True

if len(sys.argv) != 2:
    print("Need an out file name")
    exit(0)

output_file_name = sys.argv[1]


def debug_msg(msg):
    if debug:
        print(msg)


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
        print_text_box(context, x,y, the_item)


def print_horizontal_list(context, x, y, horizontal_list):
    tmp_x = x + px2pt(get_value(horizontal_list, 'shiftX', 0))
    tmp_y = y + px2pt(get_value(horizontal_list, 'shiftY', 0))
    text_direction = horizontal_list['textDirection']

    if text_direction == 'rtl':
        # start from the 'end' of the line for RTL lines
        tmp_x += px2pt(get_horizontal_list_width(horizontal_list))

    for some_item in horizontal_list['list']:
        item_width = px2pt(some_item['width'])
        item_text_direction = get_value(some_item, 'textDirection', '')
        if item_text_direction == text_direction:
            print_item(context, tmp_x, tmp_y, some_item)
        else:
            # a reverse item
            if text_direction == 'ltr':
                # need to render the RTL item to the right of its position
                print_item(context,tmp_x+item_width, tmp_y, some_item)
            else:
                # need to render the LTR item to the left of its position
                print_item(context, tmp_x - item_width, tmp_y, some_item)

        if text_direction == 'ltr':
            tmp_x += item_width
        else:
            tmp_x -= item_width


def print_vertical_list(context, x, y, vertical_list):
    tmp_x = x + px2pt(get_value(vertical_list, 'shiftX', 0))
    tmp_y = y + px2pt(get_value(vertical_list, 'shiftY', 0))

    for some_item in vertical_list['list']:
        print_item(context, tmp_x, tmp_y, some_item)
        tmp_y += px2pt(some_item['height'])


def print_item_list(context, x, y, the_list_item):
    if the_list_item['direction'] == HORIZONTAL:
        print_horizontal_list(context, x, y, the_list_item)
    else:
        print_vertical_list(context, x, y, the_list_item)


def get_horizontal_list_width(horizontal_list):
    width = 0
    for some_item in horizontal_list['list']:
        width += get_value(some_item, 'width', 0)
    return width


def print_text_box(context, x, y, text_box):
    shift_x = px2pt(get_value(text_box, 'shiftX', 0))
    shift_y = px2pt(get_value(text_box, 'shiftY', 0))
    tb_text_direction = get_value(text_box, 'textDirection', '')

    # text_box_height = px2pt(get_value(text_box, 'height', 0))
    layout = PangoCairo.create_layout(context)

    text_to_render = text_box['text']

    if tb_text_direction == 'rtl':
        debug_msg("RTL text box: " + text_box['text'])
        tb_width = px2pt(get_value(text_box, 'width', 0))
        debug_msg("Shifting " + str(tb_width) + " pts to the left")
        shift_x -= tb_width
        text_to_render = '\u202e' + text_to_render + '\u202c'

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
    layout.set_text(text_to_render)
    context.move_to(x + shift_x, y + shift_y)
    context.set_source_rgb(0, 0, 0)
    PangoCairo.show_layout(context, layout)


debug_msg("Output file name: " + output_file_name)
input_str = sys.stdin.read()
doc = json.loads(input_str)

surface_pdf = cairo.PDFSurface(output_file_name, px2pt(doc['width']), px2pt(doc['height']))
ctx_pdf = cairo.Context(surface_pdf)

debug_msg("Rendering " + str(len(doc['pages'])) + " pages")
for page in doc['pages']:
    surface_pdf.set_size(px2pt(page['width']), px2pt(page['height']))
    for item in page['items']:
        print_item(ctx_pdf, 0, 0, item)
    ctx_pdf.show_page()

exit(1)
