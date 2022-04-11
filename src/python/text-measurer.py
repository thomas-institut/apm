#!/usr/bin/env python3
import sys
import json

import cairo
import gi

gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango
from gi.repository import PangoCairo

tmp_context_width = 10
tmp_context_height = 10

measure_scale = 1000


def measure_text(context, text, font_desc):
    layout = PangoCairo.create_layout(context)
    desc = Pango.font_description_from_string(font_desc)
    layout.set_font_description(desc)
    layout.set_text(text)
    ink, logical = layout.get_extents()

    return [ink, logical, layout.get_baseline()]


def create_image_context():
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, tmp_context_width, tmp_context_height)
    return cairo.Context(surface)


input_str = sys.stdin.read()
data = json.loads(input_str)

image_ctx = create_image_context()
font_desc_string = data['fontFamily'] + ' ' + str(data['fontSize'] * measure_scale)

ink, logical, baseline = measure_text(image_ctx, data['text'], font_desc_string)

data['measurements'] = {
    'width': logical.width / (Pango.SCALE * measure_scale),
    'height': logical.height / (Pango.SCALE * measure_scale),
    'baseline': baseline / (Pango.SCALE * measure_scale)
}

sys.stdout.write(json.dumps(data))
