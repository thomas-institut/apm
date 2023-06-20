
import { performance } from "perf_hooks"

class SimpleUnitTest {

  constructor () {
    this.currentTest = null
    this.completedTests = []
    this.start = performance.now()
    this.testSuiteTitle = 'Tests'
  }

  setTitle(title) {
    this.testSuiteTitle = title
  }

  testSuite(title, suiteFunction) {
    if (this.currentTest !== null) {
      console.warn(`  Ignoring test suite '${title}', currently running test '${this.currentTest.title}'`)
      return
    }
    this.testSuiteTitle = title
    this.completedTests = []
    this.currentTest = null
    suiteFunction()
    this.suiteReport()

  }

  test(title, testFunction) {
    if (this.completedTests.length === 0) {
      // first test in the suite
      console.log(`${this.testSuiteTitle}:`)
    }
    if (this.currentTest !== null) {
      console.warn(`  Ignoring test '${title}', currently running test '${this.currentTest.title}'`)
      return
    }
    let start = performance.now()
    this.currentTest = { title: title, asserts: [], duration: 0}
    testFunction()
    this.currentTest.duration = performance.now() - start
    this.testReport(this.currentTest)
    this.completedTests.push(this.currentTest)
    this.currentTest = null
  }

  suiteReport() {
    let numExpects = this.completedTests.map( (t) => { return t.asserts.length})
      .reduce( (a,b) => a+b, 0)
    let numPasses =  this.completedTests.map( (t) => { return t.asserts.filter( (r) => { return r}).length})
      .reduce( (a,b) => a+b, 0)
    console.log(`  * ${this.completedTests.length} tests: ${numPasses}/${numExpects}`)
  }

  testReport(test) {
    if (test.asserts.length===0) {
      console.log(`  ${test.title}: No expects in test`)
      return
    }
    let result = 'PASS'
    let numPasses = test.asserts.filter( (r) => { return r}).length
    if (numPasses !== test.asserts.length) {
      result = 'FAIL'
    }
    test.result = result
    let dotReport = test.asserts.map( (r)=> { return r ? '.' : 'X'}).join('')
    console.log(`  ${test.title}: ${dotReport} ${numPasses}/${test.asserts.length} ${result} (${test.duration.toFixed(2)}ms)`)
  }



  /**
   *
   * @param {string}expectation
   * @param {boolean}result
   */
  assert(expectation, result) {
    if (this.currentTest === null) {
      console.error(`Assert while not testing`)
      return
    }
    this.currentTest.asserts.push(result)
    if (!result) {
      console.log(`${this.currentTest.title}: FAIL ${expectation}`)
    }
  }
}




let unitTestSingleton = new SimpleUnitTest()

export function test(testTitle, testFunction) {
  unitTestSingleton.test(testTitle, testFunction)
}
export function testSuite(suiteTitle, suiteFunction) {
  unitTestSingleton.testSuite(suiteTitle, suiteFunction)
}
export function expect(value) {
  return new Asserter(value)
}


function assert(expectMessage, result) {
  unitTestSingleton.assert(expectMessage, result)
}



class Asserter {
  constructor (value, context = '') {
    this.context = context
    this.value = value
  }

  toBe(expectedResult) {
    assert(`${this._getContextMessage()}expecting ${this.value} to be ${expectedResult}`, this.value === expectedResult)
  }
  toBeInstanceOf(someClass) {
    assert(`${this._getContextMessage()}expecting ${this.value} to be an instance of '${someClass}'`, this.value instanceof someClass)
  }

  /**
   *
   * @param {string}expectedString
   */
  toBeAStringEqualTo(expectedString) {
    if (typeof this.value !== 'string') {
      assert(`${this._getContextMessage()}expecting ${this.value} to be a string, got a ${typeof this.value}`, false)
      return
    }
    assert(`${this._getContextMessage()}expecting '${this.value}' to be '${expectedString}'`, this.value === expectedString)
  }

  toBeTrue() {
    if (typeof this.value !== 'boolean') {
      assert(`${this._getContextMessage()}expecting ${this.value} to be boolean and true, got a ${typeof this.value}`, false)
      return
    }
    assert(`${this._getContextMessage()}expecting ${this.value} to be true`, this.value)
  }

  toBeFalse() {
    if (typeof this.value !== 'boolean') {
      assert(`${this._getContextMessage()}expecting ${this.value} to be boolean and false, got a ${typeof this.value}`, false)
      return
    }
    assert(`${this._getContextMessage()}expecting ${this.value} to be true`, !this.value)
  }

  _getContextMessage() {
    if (this.context === '')
      return ''
    return ` ${this.context}, `
  }
}

