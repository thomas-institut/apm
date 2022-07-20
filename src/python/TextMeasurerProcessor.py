import cairo
import gi

gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango
from gi.repository import PangoCairo
from ServerProcessor import ServerProcessor

tmp_context_width = 10
tmp_context_height = 10

measure_scale = 1000


class TextMeasurerProcessor(ServerProcessor):

    def __init__(self):
        self.ctx = cairo.Context(cairo.ImageSurface(cairo.FORMAT_ARGB32, tmp_context_width, tmp_context_height))
        self.layout = PangoCairo.create_layout(self.ctx)

    def process_request(self, request):
        resp = super().process_request(request)
        data = request.get_data()
        font_desc_string = data['fontFamily'] + ' ' + str(data['fontSize'] * measure_scale)
        ink, logical, baseline = self.measure_text(data['text'], font_desc_string)
        resp.set_result({
            'width': logical.width / (Pango.SCALE * measure_scale),
            'height': logical.height / (Pango.SCALE * measure_scale),
            'baseline': baseline / (Pango.SCALE * measure_scale)
        })
        return resp

    def measure_text(self, text, font_desc):
        desc = Pango.font_description_from_string(font_desc)
        self.layout.set_font_description(desc)
        self.layout.set_text(text)
        ink, logical = self.layout.get_extents()
        return [ink, logical, self.layout.get_baseline()]