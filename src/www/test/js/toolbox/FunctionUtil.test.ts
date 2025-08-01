import { describe, expect, it } from 'vitest'
import * as FunctionUtil from '@/toolbox/FunctionUtil'

describe('FunctionUtil', ()=> {
  describe('Normal Utility Functions', () => {
    it("should return an empty string", ()=>{
      expect(FunctionUtil.returnEmptyString()).toBe('')
    })
  })
  describe('Promise Utility Functions', () => {
    it('should resolve a doNothing promise', async () => {
      let v = await FunctionUtil.doNothingPromise('test');
      expect(v).toBeUndefined();
    })
    it('should reject a fail promise', async () => {
      await expect(FunctionUtil.failPromise('test', 'someReason')).rejects.toThrow('someReason');
    })
  })
})