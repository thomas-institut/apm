

export function doNothing() {}
export function returnEmptyString() { return ''}

export function doNothingPromise(msg = '') {
  return new Promise( (resolve) => {
    if (msg !== '') {
      console.log(msg)
    }
    resolve()
  })
}


export function failPromise(msg= '') {
  return new Promise ( (resolve, reject) => {
    if (msg !== '') {
      console.log(msg)
    }
    reject()
  })
}

export function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}