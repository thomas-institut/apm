import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { ObjectUtil } from '../../../js/toolbox/ObjectUtil.mjs'

testSuite('ObjectUtil.deepGetValuesForKey', () => {
  test('Simple variables', () => {
    expect(ObjectUtil.deepGetValuesForKey(true, 'myKey')).toBeOfLength(0)
    expect(ObjectUtil.deepGetValuesForKey('someString', 'myKey')).toBeOfLength(0)
    expect(ObjectUtil.deepGetValuesForKey('myKey', 'myKey')).toBeOfLength(0)
    expect(ObjectUtil.deepGetValuesForKey(123, 'myKey')).toBeOfLength(0)
    expect(ObjectUtil.deepGetValuesForKey(() => { return 'myKey'}, 'myKey')).toBeOfLength(0)
  })

  test('Simple Arrays', () =>{
    expect(ObjectUtil.deepGetValuesForKey([ 1, 2, 3, 4], 'myKey')).toBeOfLength(0)
    expect(ObjectUtil.deepGetValuesForKey([ 'myKey', 'e2', 'e3', 'e4'], 'myKey')).toBeOfLength(0)
  })

  test('Simple Object', () => {
    let testObject1 = { a: 'a', b: 'b'}
    expect(ObjectUtil.deepGetValuesForKey(testObject1, 'myKey')).toBeOfLength(0)

    let testObject2 = { a: 'a', myKey: 'myValue', b: 'b'}
    let values = ObjectUtil.deepGetValuesForKey(testObject2, 'myKey')
    expect(values).toBeOfLength(1)
    expect(values[0]).toBeAStringEqualTo('myValue')

    let testObject3 = { a: 'a', myKey: 'topValue', b: { c: 'c', myKey: 'bottomValue', d: 'd'}}
    values = ObjectUtil.deepGetValuesForKey(testObject3, 'myKey')
    expect(values).toBeOfLength(2)
    expect(values).toContain('topValue')
    expect(values).toContain('bottomValue')
  })

  test('Complex Arrays', () => {
    let testArray1 = [ 'a', { myKey: 'value1'}, { someOtherKey: 'b'}, { myKey: 'value2'}]
    let values = ObjectUtil.deepGetValuesForKey(testArray1, 'myKey')
    expect(values).toBeOfLength(2)
    expect(values).toContain('value1')
    expect(values).toContain('value2')
  })

})