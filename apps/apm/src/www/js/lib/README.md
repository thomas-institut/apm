# js/lib

Code in this folder is meant to be shared among different JS engine (the
browser in the web app and nodeJS in the typesetting service) or eventually
be converted to an independent NPM package.

Every folder represents a potential package and, as such, should only import
code from within `js/lib` or from external packages. No abbreviations should
be used in imports because this will not work in NodeJS

- `import X from '@someShortcut/someFile'` is not allowed
- `import X from './someFile'` should be imported as `import X from ./someFile.js`

