//  A hello world for Node js

import * as Util from './toolbox/Util.mjs'
import * as MyersDiff from './toolbox/MyersDiff.mjs'


let someString = "This is a string with a lot of white space"

let processedString = Util.removeWhiteSpace(someString)

let anotherString = " This is another string with a lot less white space"


let script  = MyersDiff.calculate( someString.split(' '), anotherString.split(' '), (a,b)=>{ return a === b})


console.log(`The original string: '${someString}'`)
console.log(`The processed string: '${processedString}'`)

console.log(`Another string: '${anotherString}'`)
console.log(`MyersDiff script:`)
console.log(script)
