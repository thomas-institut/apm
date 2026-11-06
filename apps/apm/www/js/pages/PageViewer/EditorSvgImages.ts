/*
 *  Copyright (C) 2026 Universität zu Köln
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

/**
 * In-browser SVG builders for the images shown in the transcription editor
 * (chunk and chapter marks, line gaps, illegible text, etc.).
 *
 * These replace the PNG images formerly generated on the server with PHP GD. Text, colours,
 * padding and size factors are ported from the old server-side implementation.
 *
 * The SVGs are meant to be used as `img` sources (see svgToDataUri), so they cannot load
 * external resources: icons are drawn with embedded path data and text uses a
 * monospace font stack whose width is forced with `textLength`.
 */

export type MarkType = 'start' | 'end'

export interface ChunkMarkOptions {
  size: number
  workId: string
  chunkNumber: number | string
  segment: number | string
  type: MarkType
  localWitnessId?: string
}

export interface ChapterMarkOptions {
  size: number
  workId: string
  level: number | string
  number: number | string
  type: MarkType
}

interface IconPath {
  width: number
  minY: number
  maxY: number
  d: string
}

/*
 * Icon path data from Font Awesome Free 5.15.4 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 */
const FaRegularComment: IconPath = {
  width: 512,
  minY: 32,
  maxY: 480,
  d: 'M256 32C114.6 32 0 125.1 0 240c0 47.6 19.9 91.2 52.9 126.3C38 405.7 7 439.1 6.5 439.5c-6.6 7-8.4 17.2-4.6 26S14.4 480 24 480c61.5 0 110-25.7 139.1-46.3C192 442.8 223.2 448 256 448c141.4 0 256-93.1 256-208S397.4 32 256 32zm0 368c-26.7 0-53.1-4.1-78.4-12.1l-22.7-7.2-19.5 13.8c-14.3 10.1-33.9 21.4-57.5 29 7.3-12.1 14.4-25.7 19.9-40.2l10.6-28.1-20.6-21.8C69.7 314.1 48 282.2 48 240c0-88.2 93.3-160 208-160s208 71.8 208 160-93.3 160-208 160z'
}

const FaRegularEyeSlash: IconPath = {
  width: 640,
  minY: 0,
  maxY: 512,
  d: 'M634 471L36 3.51A16 16 0 0 0 13.51 6l-10 12.49A16 16 0 0 0 6 41l598 467.49a16 16 0 0 0 22.49-2.49l10-12.49A16 16 0 0 0 634 471zM296.79 146.47l134.79 105.38C429.36 191.91 380.48 144 320 144a112.26 112.26 0 0 0-23.21 2.47zm46.42 219.07L208.42 260.16C210.65 320.09 259.53 368 320 368a113 113 0 0 0 23.21-2.46zM320 112c98.65 0 189.09 55 237.93 144a285.53 285.53 0 0 1-44 60.2l37.74 29.5a333.7 333.7 0 0 0 52.9-75.11 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64c-36.7 0-71.71 7-104.63 18.81l46.41 36.29c18.94-4.3 38.34-7.1 58.22-7.1zm0 288c-98.65 0-189.08-55-237.93-144a285.47 285.47 0 0 1 44.05-60.19l-37.74-29.5a333.6 333.6 0 0 0-52.89 75.1 32.35 32.35 0 0 0 0 29.19C89.72 376.41 197.08 448 320 448c36.7 0 71.71-7.05 104.63-18.81l-46.41-36.28C359.28 397.2 339.89 400 320 400z'
}

const MonoFontFamily = "'Noto Mono', 'DejaVu Sans Mono', Menlo, Consolas, monospace"

/** Advance width of a monospace glyph as a fraction of the font size */
const MonoCharWidth = 0.6

/** Distance from the baseline to the vertical centre of capital letters, as a fraction of the font size */
const MonoCapMiddle = 0.36

/** Distance from the baseline to the vertical centre of a hyphen, as a fraction of the font size */
const MonoHyphenMiddle = 0.27

/** GD sizes are in points at 96 dpi */
const PointsToPixels = 4 / 3

const DefaultSize = 14

const GreyColor = '#C8C8C8'

/**
 * Note mark: a red Font Awesome "comment" glyph
 */
export function markSvg(size: number): string {
  const s = sanitizeSize(size)
  const height = s
  const width = Math.ceil(s * 1.2)
  return svgDoc(width, height, iconPaths(FaRegularComment, s * 0.8 * PointsToPixels, 1, width, height, '#FF0000'))
}

/**
 * No word break mark: a grey hyphen
 */
export function noWordBreakSvg(size: number): string {
  const s = sanitizeSize(size)
  const height = s
  const width = Math.ceil(s * 0.9)
  const fontPx = s * 0.9 * PointsToPixels
  return svgDoc(width, height, monoText({
    text: '-',
    x: width / 2,
    y: height / 2 + MonoHyphenMiddle * fontPx,
    fontPx: fontPx,
    color: GreyColor,
    anchorMiddle: true
  }))
}

/**
 * Illegible text: `length` blue Font Awesome "eye-slash" glyphs
 */
export function illegibleSvg(size: number, length: number | string): string {
  const s = sanitizeSize(size)
  const count = sanitizeCount(length)
  const fontPx = s * 0.8 * PointsToPixels
  const height = s
  const width = Math.ceil(count * FaRegularEyeSlash.width * fontPx / 512 + 2)
  return svgDoc(width, height, iconPaths(FaRegularEyeSlash, fontPx, count, width, height, '#000AC8'))
}

/**
 * Chunk start/end mark, e.g. "START: AW1-3-2"
 */
export function chunkMarkSvg(options: ChunkMarkOptions): string {
  let segmentText = `${options.workId}-${options.chunkNumber}-${options.segment}`
  const lwid = options.localWitnessId ?? 'A'
  if (lwid !== 'A') {
    segmentText += ` (${lwid})`
  }
  const text = `${options.type === 'start' ? 'START:' : 'END:'} ${segmentText}`
  return markLabelSvg(options.size, options.type, text, '#A5D0FF')
}

/**
 * Chapter start/end mark, e.g. "START CH: AW00 Lvl 1, n 2"
 */
export function chapterMarkSvg(options: ChapterMarkOptions): string {
  const segmentText = `${options.workId} Lvl ${options.level}, n ${options.number}`
  const text = `${options.type === 'start' ? 'START CH:' : 'END CH:'} ${segmentText}`
  return markLabelSvg(options.size, options.type, text, '#93BA95')
}

/**
 * Line gap: "[ N line(s) not transcribed ]"
 */
export function lineGapSvg(size: number, count: number | string): string {
  const s = sanitizeSize(size)
  const text = `[ ${sanitizeCount(count)} line(s) not transcribed ]`
  const fontPx = s * 0.7 * PointsToPixels
  const textWidth = monoTextWidth(text, fontPx)
  const height = s + 8
  const width = Math.ceil(textWidth + 5)
  return svgDoc(width, height, [
    background(width, height, '#F4F5F7'),
    monoText({ text: text, x: (width - textWidth) / 2, y: height / 2 + MonoCapMiddle * fontPx, fontPx: fontPx, color: '#323232' })
  ].join(''))
}

/**
 * Character gap: `length` grey dots
 */
export function characterGapSvg(size: number, length: number | string): string {
  const s = sanitizeSize(size)
  const count = sanitizeCount(length)
  const fontPx = s * 0.8 * PointsToPixels
  const advance = MonoCharWidth * fontPx
  const height = s
  const width = Math.ceil(count * advance + 2)
  const offset = (width - count * advance) / 2
  const radius = fmt(0.07 * fontPx)
  const dots: string[] = []
  for (let i = 0; i < count; i++) {
    dots.push(`<circle cx="${fmt(offset + (i + 0.5) * advance)}" cy="${fmt(height / 2)}" r="${radius}" fill="${GreyColor}"/>`)
  }
  return svgDoc(width, height, dots.join(''))
}

/**
 * Paragraph mark: a grey pilcrow
 */
export function paragraphMarkSvg(size: number): string {
  const s = sanitizeSize(size)
  const text = '¶'
  const fontPx = s * 0.8 * PointsToPixels
  const textWidth = monoTextWidth(text, fontPx)
  const height = s
  const width = Math.ceil(textWidth + 2)
  return svgDoc(width, height, monoText({
    text: text,
    x: (width - textWidth) / 2,
    y: height / 2 + MonoCapMiddle * fontPx,
    fontPx: fontPx,
    color: GreyColor
  }))
}

/**
 * Returns a data URI for the given SVG, suitable for an `img` src attribute
 */
export function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function markLabelSvg(size: number, type: MarkType, text: string, backgroundColor: string): string {
  const s = sanitizeSize(size)
  const fontPx = s * (type === 'start' ? 0.7 : 0.5) * PointsToPixels
  const textWidth = monoTextWidth(text, fontPx)
  const height = s + 5
  const width = Math.ceil(textWidth + 7)
  return svgDoc(width, height, [
    background(width, height, backgroundColor),
    monoText({ text: text, x: (width - textWidth) / 2, y: height / 2 + MonoCapMiddle * fontPx, fontPx: fontPx, color: '#32323C' })
  ].join(''))
}

interface MonoTextOptions {
  text: string
  x: number
  y: number
  fontPx: number
  color: string
  anchorMiddle?: boolean
}

function monoText(options: MonoTextOptions): string {
  const anchor = options.anchorMiddle === true ? ' text-anchor="middle"' : ''
  return `<text x="${fmt(options.x)}" y="${fmt(options.y)}" font-family="${escapeXml(MonoFontFamily)}" ` +
    `font-size="${fmt(options.fontPx)}" fill="${options.color}"${anchor} ` +
    `textLength="${fmt(monoTextWidth(options.text, options.fontPx))}" lengthAdjust="spacingAndGlyphs" ` +
    `xml:space="preserve">${escapeXml(options.text)}</text>`
}

function monoTextWidth(text: string, fontPx: number): number {
  return Array.from(text).length * MonoCharWidth * fontPx
}

/**
 * Draws `count` copies of the given icon side by side, centred in the canvas.
 * The icon is scaled so that its em square (512 units) matches `fontPx`, as in a font.
 */
function iconPaths(icon: IconPath, fontPx: number, count: number, width: number, height: number, color: string): string {
  const scale = fontPx / 512
  const totalWidth = count * icon.width * scale
  const x0 = (width - totalWidth) / 2
  const y = height / 2 - (icon.minY + icon.maxY) / 2 * scale
  const paths: string[] = []
  for (let i = 0; i < count; i++) {
    const x = x0 + i * icon.width * scale
    paths.push(`<path transform="translate(${fmt(x)} ${fmt(y)}) scale(${fmt(scale, 5)})" fill="${color}" d="${icon.d}"/>`)
  }
  return paths.join('')
}

function background(width: number, height: number, color: string): string {
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="${color}"/>`
}

function svgDoc(width: number, height: number, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeSize(size: number | string): number {
  const s = typeof size === 'number' ? size : parseFloat(size)
  if (!Number.isFinite(s) || s <= 0) {
    return DefaultSize
  }
  return s
}

function sanitizeCount(count: number | string): number {
  const n = typeof count === 'number' ? Math.floor(count) : parseInt(count)
  if (!Number.isFinite(n) || n < 1) {
    return 1
  }
  return n
}

function fmt(n: number, decimals: number = 2): number {
  return parseFloat(n.toFixed(decimals))
}
