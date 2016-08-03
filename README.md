# RAML PHP Generator

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]

> Generate a PHP API client from RAML.

## Installation

```
npm install raml-php-generator -g
```

## Usage

This module depends on [raml-generator](https://github.com/mulesoft-labs/raml-generator) and can be used globally or locally with JavaScript.

* Chained DSL generation
* `README.md` output

### Global

```
raml-php-generator api.raml -o php-client
```

### Locally

```js
var jsGenerator = require('raml-php-generator')

var output = jsGenerator(/* api, data */)
```

## License

Apache License 2.0

[npm-image]: https://img.shields.io/npm/v/raml-php-generator.svg?style=flat
[npm-url]: https://npmjs.org/package/raml-php-generator
[downloads-image]: https://img.shields.io/npm/dm/raml-php-generator.svg?style=flat
[downloads-url]: https://npmjs.org/package/raml-php-generator
[travis-image]: https://img.shields.io/travis/jayS-de/raml-php-generator.svg?style=flat
[travis-url]: https://travis-ci.org/jayS-de/raml-php-generator
