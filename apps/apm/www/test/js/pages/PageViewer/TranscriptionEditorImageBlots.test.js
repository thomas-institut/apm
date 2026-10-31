/**
 * @vitest-environment happy-dom
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { TranscriptionEditor } from '@/pages/PageViewer/TranscriptionEditor'
import { configureTranscriptionEditorBlots } from '@/pages/PageViewer/TranscriptionEditorBlotConfig'

const DataUriPrefix = 'data:image/svg+xml;charset=utf-8,'

function decodeSrc(src) {
  expect(src.startsWith(DataUriPrefix)).toBe(true)
  return decodeURIComponent(src.substring(DataUriPrefix.length))
}

function getImageBlot(name) {
  return TranscriptionEditor.imageBlots.find((b) => b.name === name)
}

describe('TranscriptionEditor image blots', () => {
  beforeAll(() => {
    TranscriptionEditor.imageBlots = []
    configureTranscriptionEditorBlots()
  })

  it('should register a getImageSrc hook returning an SVG data URI for every image blot', () => {
    const names = TranscriptionEditor.imageBlots.map((b) => b.name).sort()
    expect(names).toEqual(['chaptermark', 'chgap', 'chunkmark', 'illegible', 'linegap', 'mark', 'nowb', 'pmark'])
    const value = { text: "AW1", target: '2', extrainfo: 'A', thelength: '3', alttext: 'start' }
    for (const blot of TranscriptionEditor.imageBlots) {
      const src = blot.jsClass.getImageSrc(14, blot.name === 'chaptermark' ? { ...value, text: "Ch\tTitle", extrainfo: 'AW00' } : value)
      expect(decodeSrc(src)).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
      expect(src).not.toContain('api/images')
    }
  })

  it('should map chunk mark values to the image text', () => {
    const src = getImageBlot('chunkmark').jsClass.getImageSrc(14,
      { text: 'AW1', target: '3', extrainfo: 'B', thelength: '2', alttext: 'end' })
    expect(decodeSrc(src)).toContain('>END: AW1-3-2 (B)<')
  })

  it('should map chapter mark values to the image text', () => {
    const src = getImageBlot('chaptermark').jsClass.getImageSrc(14,
      { text: "Chapter\tTitle", target: '2', extrainfo: 'AW00', thelength: '1', alttext: 'start' })
    expect(decodeSrc(src)).toContain('>START CH: AW00 Lvl 1, n 2<')
  })

  it('should map line gap values to the image text', () => {
    const src = getImageBlot('linegap').jsClass.getImageSrc(14, { thelength: '4' })
    expect(decodeSrc(src)).toContain('>[ 4 line(s) not transcribed ]<')
  })

  it('should set the img src in the created node without changing its value', () => {
    const blotClass = getImageBlot('chgap').jsClass
    blotClass.size = 1
    const value = { itemid: '10', editorid: '1', thelength: '4' }
    const node = blotClass.create(value)
    expect(node.tagName.toLowerCase()).toBe('img')
    expect(decodeSrc(node.getAttribute('src')).match(/<circle/g)?.length).toBe(4)
    expect(blotClass.value(node)).toEqual(value)
  })
})
