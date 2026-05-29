import { describe, it, expect, vi } from 'vitest'
import { Matrix } from '@/lib/Matrix'

describe('Matrix', () => {
  it('should initialize with default values', () => {
    const matrix = new Matrix(2, 3, 0)
    expect(matrix.nRows).toBe(2)
    expect(matrix.nCols).toBe(3)
    expect(matrix.getArray()).toEqual([
      [0, 0, 0],
      [0, 0, 0]
    ])
  })

  it('should get value from matrix', () => {
    const matrix = new Matrix(2, 2, 1)
    expect(matrix.getValue(0, 0)).toBe(1)
    expect(matrix.getValue(1, 1)).toBe(1)
  })

  it('should set value in matrix', () => {
    const matrix = new Matrix(2, 2, 0)
    matrix.setValue(0, 1, 5)
    expect(matrix.getValue(0, 1)).toBe(5)
  })

  it('should handle out of range get/set with throwing Error', () => {
    const matrix = new Matrix(2, 2, 0)

    expect(() => matrix.getValue(2, 0)).toThrow('Out of range row/col getting value')
    expect(() => matrix.setValue(0, 2, 10)).toThrow('Out of range row/col setting value')
  })

  it('should get a row', () => {
    const matrix = new Matrix(2, 2, 0)
    matrix.setValue(1, 0, 1)
    matrix.setValue(1, 1, 2)
    expect(matrix.getRow(1)).toEqual([1, 2])
  })

  it('should get a column', () => {
    const matrix = new Matrix(2, 2, 0)
    matrix.setValue(0, 1, 1)
    matrix.setValue(1, 1, 2)
    expect(matrix.getColumn(1)).toEqual([1, 2])
  })

  it('should set from array and handle clipping/padding', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const matrix = new Matrix(2, 2, 0)

    // Exact match
    matrix.setFromArray([
      [1, 2],
      [3, 4]
    ])
    expect(matrix.getArray()).toEqual([
      [1, 2],
      [3, 4]
    ])

    // Reset matrix for next test
    matrix.setFromArray([
      [0, 0],
      [0, 0]
    ])

    // Clipping/Padding case
    // In this case, nRows = 2, nCols = 3 (from theArray[0].length)
    matrix.setFromArray([
      [5, 6, 7], // matches nCols=3
      [8]       // length 1 != 3, will trigger warn
    ])
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    
    expect(matrix.nRows).toBe(2)
    expect(matrix.nCols).toBe(3) 
    expect(matrix.getValue(0, 0)).toBe(5)
    expect(matrix.getValue(0, 1)).toBe(6)
    expect(matrix.getValue(0, 2)).toBe(7)
    expect(matrix.getValue(1, 0)).toBe(8)
    expect(matrix.getValue(1, 1)).toBe(0) // padded with defaultValue
    expect(matrix.getValue(1, 2)).toBe(0) // padded with defaultValue

    consoleSpy.mockRestore()
  })

  it('should delete a column', () => {
    const matrix = new Matrix(2, 3, 0)
    matrix.setFromArray([
      [1, 2, 3],
      [4, 5, 6]
    ])
    matrix.deleteColumn(1)
    expect(matrix.nCols).toBe(2)
    expect(matrix.getArray()).toEqual([
      [1, 3],
      [4, 6]
    ])
  })

  it('should add a column after specified index', () => {
    const matrix = new Matrix(2, 2, 0)
    matrix.setFromArray([
      [1, 2],
      [3, 4]
    ])
    matrix.addColumnAfter(0, 9)
    expect(matrix.nCols).toBe(3)
    expect(matrix.getArray()).toEqual([
      [1, 9, 2],
      [3, 9, 4]
    ])

    matrix.addColumnAfter(-1, 8)
    expect(matrix.nCols).toBe(4)
    expect(matrix.getArray()).toEqual([
      [8, 1, 9, 2],
      [8, 3, 9, 4]
    ])
  })

  it('should check if a column is empty', () => {
    const matrix = new Matrix(3, 2, '')
    matrix.setValue(0, 0, 'data')
    matrix.setValue(1, 0, '')
    matrix.setValue(2, 0, '')

    const isEmpty = (_r:number, _c:number, val: string) => val === ''

    expect(matrix.isColumnEmpty(0, isEmpty)).toBe(false)
    expect(matrix.isColumnEmpty(1, isEmpty)).toBe(true)
  })

  it('should log the matrix', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const matrix = new Matrix(2, 2, 0)
    matrix.logMatrix('Test Title')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Matrix Test Title'))
    consoleSpy.mockRestore()
  })

  it('should compare equality with another Matrix or Array', () => {
    const matrix1 = new Matrix(2, 2, 0)
    matrix1.setFromArray([[1, 2], [3, 4]])

    const matrix2 = new Matrix(2, 2, 0)
    matrix2.setFromArray([[1, 2], [3, 4]])

    const matrix3 = new Matrix(2, 2, 0)
    matrix3.setFromArray([[1, 2], [3, 5]])

    expect(matrix1.isEqualTo(matrix2)).toBe(true)
    expect(matrix1.isEqualTo(matrix3)).toBe(false)
    expect(matrix1.isEqualTo([[1, 2], [3, 4]])).toBe(true)
    expect(matrix1.isEqualTo([[1, 2], [3, 5]])).toBe(false)

    const matrixDiffSize = new Matrix(2, 3, 0)
    expect(matrix1.isEqualTo(matrixDiffSize)).toBe(false)
  })

  it('should clone the matrix', () => {
    const matrix = new Matrix(2, 2, 0)
    matrix.setValue(0, 0, 1)
    const cloned = matrix.clone()

    expect(cloned).not.toBe(matrix)
    expect(cloned.getArray()).not.toBe(matrix.getArray())
    expect(cloned.isEqualTo(matrix)).toBe(true)

    cloned.setValue(0, 0, 9)
    expect(matrix.getValue(0, 0)).toBe(1)
    expect(cloned.getValue(0, 0)).toBe(9)
  })
})
