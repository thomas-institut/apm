

export function doNothing() {}
export function returnEmptyString() { return ''}

export function resolvedPromise(returnValue) {
  return new Promise( (resolve) => {
    resolve(returnValue)
  })
}

export function doNothingPromise(msg = '') {
  return new Promise( (resolve) => {
    if (msg !== '') {
      console.log(msg)
    }
    resolve()
  })
}

export function failPromise(msg= '', reason = 'no reason') {
  return new Promise ( (resolve, reject) => {
    if (msg !== '') {
      console.log(msg)
    }
    reject(reason)
  })
}

export function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}