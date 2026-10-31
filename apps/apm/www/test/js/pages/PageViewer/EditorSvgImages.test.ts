/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest'
import {
  chapterMarkSvg,
  characterGapSvg,
  chunkMarkSvg,
  illegibleSvg,
  lineGapSvg,
  markSvg,
  noWordBreakSvg,
  paragraphMarkSvg,
  svgToDataUri
} from '@/pages/PageViewer/EditorSvgImages'

function parseSvg(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement
  expect(root.tagName.toLowerCase()).toBe('svg')
  expect(doc.getElementsByTagName('parsererror').length).toBe(0)
  return root as unknown as SVGSVGElement
}

function getText(svg: string): string {
  return parseSvg(svg).querySelector('text')?.textContent ?? ''
}

function getWidth(svg: string): number {
  return parseFloat(parseSvg(svg).getAttribute('width') ?? 'NaN')
}

function getHeight(svg: string): number {
  return parseFloat(parseSvg(svg).getAttribute('height') ?? 'NaN')
}

function getBackground(svg: string): string | null {
  return parseSvg(svg).querySelector('rect')?.getAttribute('fill') ?? null
}

describe('EditorSvgImages', () => {

  describe('common structure', () => {
    const allSvgs = [
      markSvg(14),
      noWordBreakSvg(14),
      illegibleSvg(14, 2),
      chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start' }),
      chapterMarkSvg({ size: 14, workId: 'AW00', level: 1, number: 2, type: 'end' }),
      lineGapSvg(14, 3),
      characterGapSvg(14, 3),
      paragraphMarkSvg(14)
    ]

    it('should produce parseable SVG with namespace and explicit positive dimensions', () => {
      for (const svg of allSvgs) {
        const root = parseSvg(svg)
        expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
        expect(getWidth(svg)).toBeGreaterThan(0)
        expect(getHeight(svg)).toBeGreaterThan(0)
      }
    })

    it('should not reference external resources', () => {
      for (const svg of allSvgs) {
        expect(svg).not.toMatch(/href|url\(|@import/)
      }
    })

    it('should grow with size', () => {
      expect(getWidth(markSvg(20))).toBeGreaterThan(getWidth(markSvg(14)))
      expect(getHeight(markSvg(20))).toBeGreaterThan(getHeight(markSvg(14)))
      expect(getWidth(lineGapSvg(20, 1))).toBeGreaterThan(getWidth(lineGapSvg(14, 1)))
      expect(getHeight(lineGapSvg(20, 1))).toBeGreaterThan(getHeight(lineGapSvg(14, 1)))
      const chunk = (size: number) => chunkMarkSvg({ size, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start' })
      expect(getWidth(chunk(20))).toBeGreaterThan(getWidth(chunk(14)))
      expect(getHeight(chunk(20))).toBeGreaterThan(getHeight(chunk(14)))
    })

    it('should fall back to a default size on invalid input', () => {
      expect(getHeight(markSvg(NaN))).toBe(14)
      expect(getHeight(paragraphMarkSvg(0))).toBe(14)
    })
  })

  describe('chunkMarkSvg', () => {
    it('should show start and end texts', () => {
      expect(getText(chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start' })))
        .toBe('START: AW1-3-2')
      expect(getText(chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'end' })))
        .toBe('END: AW1-3-2')
    })

    it('should add the local witness id only when it is not A', () => {
      expect(getText(chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start', localWitnessId: 'B' })))
        .toBe('START: AW1-3-2 (B)')
      expect(getText(chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start', localWitnessId: 'A' })))
        .toBe('START: AW1-3-2')
    })

    it('should use the chunk mark colours and dimensions', () => {
      const svg = chunkMarkSvg({ size: 14, workId: 'AW1', chunkNumber: 3, segment: 2, type: 'start' })
      expect(getBackground(svg)).toBe('#A5D0FF')
      expect(parseSvg(svg).querySelector('text')?.getAttribute('fill')).toBe('#32323C')
      expect(getHeight(svg)).toBe(19)
    })

    it('should escape user supplied text', () => {
      const svg = chunkMarkSvg({ size: 14, workId: 'A<&"\'>', chunkNumber: 3, segment: 2, type: 'start', localWitnessId: '<x>' })
      expect(getText(svg)).toBe('START: A<&"\'>-3-2 (<x>)')
    })
  })

  describe('chapterMarkSvg', () => {
    it('should show start and end texts', () => {
      expect(getText(chapterMarkSvg({ size: 14, workId: 'AW00', level: 1, number: 2, type: 'start' })))
        .toBe('START CH: AW00 Lvl 1, n 2')
      expect(getText(chapterMarkSvg({ size: 14, workId: 'AW00', level: '1', number: '2', type: 'end' })))
        .toBe('END CH: AW00 Lvl 1, n 2')
    })

    it('should use the chapter mark background', () => {
      expect(getBackground(chapterMarkSvg({ size: 14, workId: 'AW00', level: 1, number: 2, type: 'start' })))
        .toBe('#93BA95')
    })
  })

  describe('lineGapSvg', () => {
    it('should show the number of lines', () => {
      const svg = lineGapSvg(14, 5)
      expect(getText(svg)).toBe('[ 5 line(s) not transcribed ]')
      expect(getHeight(svg)).toBe(22)
      expect(getBackground(svg)).toBe('#F4F5F7')
      expect(parseSvg(svg).querySelector('text')?.getAttribute('fill')).toBe('#323232')
    })

    it('should accept string counts and handle invalid ones', () => {
      expect(getText(lineGapSvg(14, '7'))).toBe('[ 7 line(s) not transcribed ]')
      expect(getText(lineGapSvg(14, 'abc'))).toBe('[ 1 line(s) not transcribed ]')
      expect(getText(lineGapSvg(14, 0))).toBe('[ 1 line(s) not transcribed ]')
    })

    it('should fit the text to the computed width', () => {
      const svg = lineGapSvg(14, 5)
      const text = parseSvg(svg).querySelector('text')
      expect(text?.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs')
      expect(parseFloat(text?.getAttribute('textLength') ?? '0')).toBeLessThan(getWidth(svg))
    })
  })

  describe('icons', () => {
    it('markSvg should contain one red comment path', () => {
      const paths = parseSvg(markSvg(14)).querySelectorAll('path')
      expect(paths.length).toBe(1)
      expect(paths[0].getAttribute('fill')).toBe('#FF0000')
      expect(paths[0].getAttribute('d')).toMatch(/^M256 32C114\.6/)
    })

    it('illegibleSvg should contain one eye-slash path per character', () => {
      const paths = parseSvg(illegibleSvg(14, 3)).querySelectorAll('path')
      expect(paths.length).toBe(3)
      for (const path of Array.from(paths)) {
        expect(path.getAttribute('fill')).toBe('#000AC8')
        expect(path.getAttribute('d')).toMatch(/^M634 471L36/)
      }
      expect(getWidth(illegibleSvg(14, 3))).toBeGreaterThan(getWidth(illegibleSvg(14, 1)))
    })

    it('illegibleSvg should handle string and invalid lengths', () => {
      expect(parseSvg(illegibleSvg(14, '2')).querySelectorAll('path').length).toBe(2)
      expect(parseSvg(illegibleSvg(14, -4)).querySelectorAll('path').length).toBe(1)
    })
  })

  describe('characterGapSvg', () => {
    it('should show one grey dot per character', () => {
      const dots = parseSvg(characterGapSvg(14, 4)).querySelectorAll('circle')
      expect(dots.length).toBe(4)
      expect(dots[0].getAttribute('fill')).toBe('#C8C8C8')
      expect(getBackground(characterGapSvg(14, 4))).toBeNull()
    })

    it('should grow with length', () => {
      expect(getWidth(characterGapSvg(14, 8))).toBeGreaterThan(getWidth(characterGapSvg(14, 4)))
      expect(parseSvg(characterGapSvg(14, '3')).querySelectorAll('circle').length).toBe(3)
    })
  })

  describe('text marks', () => {
    it('paragraphMarkSvg should show a grey pilcrow', () => {
      const svg = paragraphMarkSvg(14)
      expect(getText(svg)).toBe('¶')
      expect(parseSvg(svg).querySelector('text')?.getAttribute('fill')).toBe('#C8C8C8')
    })

    it('noWordBreakSvg should show a grey hyphen', () => {
      const svg = noWordBreakSvg(14)
      expect(getText(svg)).toBe('-')
      expect(parseSvg(svg).querySelector('text')?.getAttribute('fill')).toBe('#C8C8C8')
    })
  })

  describe('svgToDataUri', () => {
    it('should produce an SVG data URI that decodes to the same SVG', () => {
      const svg = paragraphMarkSvg(14)
      const uri = svgToDataUri(svg)
      const prefix = 'data:image/svg+xml;charset=utf-8,'
      expect(uri.startsWith(prefix)).toBe(true)
      expect(uri).not.toMatch(/[\s<>"#¶]/)
      expect(decodeURIComponent(uri.substring(prefix.length))).toBe(svg)
    })
  })
})
