import { describe, expect, it } from 'vitest'
import * as ArrayUtil from '@/toolbox/ArrayUtil'

describe('ArrayUtil', ()=> {
  describe('Basic Functions', () => {

    it("should create index array", ()=>{
      expect(ArrayUtil.createIndexArray(5)).toEqual([0, 1, 2, 3, 4])
    });

    it('should compare values of any variable', () => {
      let obj1 = { a: 'x', b: 'y'}
      let obj2 = { a: 'x', b: 'y'}
      let obj3 = { c: 'x', b: 'y'}
      let obj4 = { a: 'x', b: 'y', c: 'z'}
      let obj5 = { b: 'y', a: 'x'}
      let var3 = 5
      expect(ArrayUtil.varsAreEqual(obj1, obj1)).toBe(true)
      expect(ArrayUtil.varsAreEqual(obj1, obj2)).toBe(true)
      expect(ArrayUtil.varsAreEqual(obj1, obj3)).toBe(false)
      expect(ArrayUtil.varsAreEqual(obj1, obj4)).toBe(false)
      expect(ArrayUtil.varsAreEqual(obj1, obj5)).toBe(false)
      expect(ArrayUtil.varsAreEqual(obj1, var3)).toBe(false)
    })
  })
})