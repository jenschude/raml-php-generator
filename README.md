# RAML PHP Client Generator


> Generate a PHP API client from RAML.

## Installation

```
npm install raml-php-generator -g
```

## Usage

This module depends on [raml-generator](https://github.com/mulesoft-labs/raml-generator) and can be used globally or locally with JavaScript.

### Global

```
raml-php-generator api.raml -o api-client-php
```

### Locally

```js
var phpGenerator = require('raml-php-generator')

var output = phpGenerator(/* raml, data */)
```

## License

Apache License 2.0