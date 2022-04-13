#!/usr/bin/env python3

#
# Renders an array of pages
# Expects a json string in stdin
#
#  pdf-renderer [-o fileNamePrefix] -
#


import cairo
import gi

gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango
from gi.repository import PangoCairo



