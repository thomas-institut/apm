import { describe, expect, test } from 'vitest'
import { ObjectUtil } from '@/toolbox/ObjectUtil'

describe('ObjectUtil.deepGetValuesForKey', () => {
  test('Simple variables', () => {
    expect(ObjectUtil.deepGetValuesForKey(true, 'myKey')).toHaveLength(0)
    expect(ObjectUtil.deepGetValuesForKey('someString', 'myKey')).toHaveLength(0)
    expect(ObjectUtil.deepGetValuesForKey('myKey', 'myKey')).toHaveLength(0)
    expect(ObjectUtil.deepGetValuesForKey(123, 'myKey')).toHaveLength(0)
    expect(ObjectUtil.deepGetValuesForKey(() => { return 'myKey'}, 'myKey')).toHaveLength(0)
  })

  test('Simple Arrays', () =>{
    expect(ObjectUtil.deepGetValuesForKey([ 1, 2, 3, 4], 'myKey')).toHaveLength(0)
    expect(ObjectUtil.deepGetValuesForKey([ 'myKey', 'e2', 'e3', 'e4'], 'myKey')).toHaveLength(0)
  })

  test('Simple Object', () => {
    let testObject1 = { a: 'a', b: 'b'}
    expect(ObjectUtil.deepGetValuesForKey(testObject1, 'myKey')).toHaveLength(0)

    let testObject2 = { a: 'a', myKey: 'myValue', b: 'b'}
    let values = ObjectUtil.deepGetValuesForKey(testObject2, 'myKey')
    expect(values).toHaveLength(1)
    expect(values[0]).toBe('myValue')

    let testObject3 = { a: 'a', myKey: 'topValue', b: { c: 'c', myKey: 'bottomValue', d: 'd'}}
    values = ObjectUtil.deepGetValuesForKey(testObject3, 'myKey')
    expect(values).toHaveLength(2)
    expect(values).toContain('topValue')
    expect(values).toContain('bottomValue')
  })

  test('Complex Arrays', () => {
    let testArray1 = [ 'a', { myKey: 'value1'}, { someOtherKey: 'b'}, { myKey: 'value2'}]
    let values = ObjectUtil.deepGetValuesForKey(testArray1, 'myKey')
    expect(values).toHaveLength(2)
    expect(values).toContain('value1')
    expect(values).toContain('value2')
  })

})