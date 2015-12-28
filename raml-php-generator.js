var path = require('path')
var fs = require('fs')
var generator = require('raml-generator')

module.exports = generator({
    templates: {
        'README.md': fs.readFileSync(path.join(__dirname, 'lib/templates/README.md.hbs'), 'utf8'),
        'INSTALL.md': fs.readFileSync(path.join(__dirname, 'lib/templates/INSTALL.md.hbs'), 'utf8'),
        'composer.json': fs.readFileSync(path.join(__dirname, 'lib/templates/composer.json.hbs'), 'utf8'),
        'index.php': fs.readFileSync(path.join(__dirname, 'lib/templates/index.php.hbs'), 'utf8')
    },
    partials: {
        auth: fs.readFileSync(path.join(__dirname, 'lib/partials/auth.js.hbs'), 'utf8'),
        utils: fs.readFileSync(path.join(__dirname, 'lib/partials/utils.php.hbs'), 'utf8'),
        client: fs.readFileSync(path.join(__dirname, 'lib/partials/client.php.hbs'), 'utf8'),
        resources: fs.readFileSync(path.join(__dirname, 'lib/partials/resources.php.hbs'), 'utf8')
    },
    helpers: {
        stringify: require('javascript-stringify'),
        dependencies: require('./lib/helpers/dependencies'),
        requestSnippet: require('./lib/helpers/request-snippet'),
        parametersSnippet: require('./lib/helpers/parameters-snippet')
    }
});
