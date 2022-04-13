/*
 * pango-cairo.js
 */

import GI from 'node-gtk/lib/index.js'
const Cairo = GI.require('cairo')
const Pango  = GI.require('Pango')
const PangoCairo = GI.require('PangoCairo')

// gi.startLoop()
// Gtk.init()

const surface = new Cairo.ImageSurface(Cairo.Format.RGB24, 300, 300)
const cr = new Cairo.Context(surface)
const fd = Pango.fontDescriptionFromString('FreeSerif 12')
const layout = PangoCairo.createLayout(cr)
layout.setFontDescription(fd)
layout.setAlignment(Pango.Alignment.LEFT)
//layout.setMarkup('<span font_weight="bold">A</span>')
// const [boldWidth, boldHeight] = layout.getSize()
// layout.setMarkup('<span>A</span>')
const pixels = layout.getPixelSize()
const [normalWidth, normalHeight] = layout.getSize()

console.log({ fd, pixels, normalWidth })