/* global FunctionUtil */

describe('FunctionUtil', ()=> {
  describe('Normal Utility Functions', () => {
    it("should return an empty string", ()=>{
      expect(FunctionUtil.returnEmptyString()).toBe('')
    })
  })
  describe('Promise Utility Functions', () => {
    it('should resolve a doNothing promise', () => {
      return expectAsync(FunctionUtil.doNothingPromise('test')).toBeResolved().then( (v) => {
        expect(v).toBeUndefined()
      })
    })
    it('should reject a fail promise', () => {
      return expectAsync(FunctionUtil.failPromise('test', 'someReason')).toBeRejectedWith('someReason')
    })
  })
})