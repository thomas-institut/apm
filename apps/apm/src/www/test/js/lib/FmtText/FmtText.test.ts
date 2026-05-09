import {describe, expect, it} from 'vitest';
import {
  fromCompactFmtText, fromString, getNormalizedToken, getPlainText, toCompactFmtText
} from "@/lib/FmtText/FmtText";


describe("FmtText", () => {

  describe("Constructors", () => {

    it('should create from string', () => {
      const text = 'This is a test';
      const fmtText = fromString(text);
      expect(getPlainText(fmtText)).toEqual(text);
      expect(fmtText.length).toBe(7);
      expect(fmtText.filter(t => t.type === 'glue').length).toBe(3);

      const fmtText2 = fromCompactFmtText(text);
      expect(getPlainText(fmtText2)).toEqual(text);
      expect(fmtText2.length).toBe(7);
      expect(fmtText2.filter(t => t.type === 'glue').length).toBe(3);

      expect(getPlainText(fromString("This is a test\nwith a newline"))).toEqual("This is a test with a newline");
      expect(getPlainText(fromString("This is a test\twith a tab"))).toEqual("This is a test with a tab");
    });

    it('should create from string array', () => {
      const stringArray = ['This ', 'is ', 'a ', 'test'];
      const fmtText = fromCompactFmtText(stringArray);
      expect(getPlainText(fmtText)).toEqual('This is a test');
      expect(fmtText.length).toBe(7);
      expect(fmtText.filter(t => t.type === 'glue').length).toBe(3);
    });
  });

  describe("Normalizers", () => {
    it('should normalize text', () => {
      expect(getNormalizedToken({
        type: 'text', text: 'Test', textDirection: '', fontWeight: '', fontStyle: '', fontSize: 1
      })).toEqual({type: 'text', text: 'Test'});

      expect(getNormalizedToken({
        type: 'text', text: 'Test', textDirection: '', fontWeight: '', fontStyle: '', fontSize: 2
      })).toEqual({type: 'text', text: 'Test', fontSize: 2});
      expect(getNormalizedToken({
        type: 'text', text: 'Test', textDirection: '', fontWeight: 'bold', fontStyle: '', fontSize: 1
      })).toEqual({type: 'text', text: 'Test', fontWeight: 'bold'});
    });

    it('should normalize glue', () => {
      expect(getNormalizedToken({
        type: 'glue', width: -1, space: '', stretch: 0, shrink: 0
      })).toEqual({type: 'glue'});
      expect(getNormalizedToken({
        type: 'glue', width: -1, space: '', stretch: 10, shrink: 0
      })).toEqual({type: 'glue', stretch: 10});
      expect(getNormalizedToken({
        type: 'glue', width: -1, space: '', stretch: 0, shrink: 10
      })).toEqual({type: 'glue', shrink: 10});
      expect(getNormalizedToken({
        type: 'glue', width: 10, space: 'custom', stretch: 0, shrink: 0
      })).toEqual({type: 'glue', width: 10, space: 'custom'});
    });

    it('should normalize marks', () => {
      expect(getNormalizedToken({type: 'mark', markType: 'test', style: ''})).toEqual({type: 'mark', markType: 'test'});
    });
  });

  describe('Compact FmtText', () => {
    it('should compact FmtText', () => {
      expect(toCompactFmtText([{type: 'text', text: 'Test'}, {type: 'glue', width: -1}, {
        type: 'text', text: '1'
      }])).toBe('Test 1');

      expect(toCompactFmtText([{type: 'text', text: 'Test'}, {type: 'glue'}, {
        type: 'text', text: '1'
      }])).toBe('Test 1');

      expect(toCompactFmtText([{type: 'text', text: 'Test'}, {type: 'glue'}, {
        type: 'text', text: '1'
      }, {type: 'mark', markType: 'test'}, {type: 'text', text: 'Test'}, {type: 'glue'}, {
        type: 'text', text: '2'
      },])).toEqual(['Test 1', {type: 'mark', markType: 'test'}, 'Test 2']);

      expect(toCompactFmtText([])).toEqual('');

      expect(toCompactFmtText([{type: 'text', text: ''}, {type: 'glue', width: 0}])).toEqual('');
    });
  });
});