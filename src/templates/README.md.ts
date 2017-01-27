import {Api} from 'raml-generator'
import paramCase = require('param-case')
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import {Strands} from 'strands'

import {hasSecurity, allResources, getSecuritySchemes} from '../support/api'
import {getUriParametersSnippet} from '../support/resource'
import {getRequestSnippet, getDisplayName} from '../support/method'
import {toNamespace} from "../support/feature";

export default function (api: any) {
    const s = new Strands()
    const projectName = paramCase(api.title) + '/raml-php-sdk';
    const className = pascalCase(api.title)

    s.multiline(`
> This package has been generated using [raml-php-generator](https://github.com/jayS-de/raml-php-generator)

# ${api.title}

Client and Request Builder for making API requests against [${api.title}](${api.baseUri}).

## Installation

\`\`\`sh
composer require ${projectName}
\`\`\`

## Usage

\`\`\`php
namespace ${toNamespace(api.title)};

require_once __DIR__ . '/vendor/autoload.php';

$client = new Client();
\`\`\`
`)

    if (hasSecurity(api, 'OAuth 2.0')) {
        s.multiline(`### Authentication

#### OAuth 2.0

This API supports authentication with [OAuth 2.0](https://github.com/thephpleague/oauth2-client). Initialize the \`OAuth2\` instance with the application client id, client secret and a redirect uri to authenticate with users.

\`\`\`php
$credentials = [
    'clientId' => 'your client id',
    'clientSecret' => 'your client secret'
];

$client = new Client(['credentials' => $credentials]);

// Available methods for OAuth 2.0:`)

        for (const scheme of getSecuritySchemes(api)) {
            if (scheme.type === 'OAuth 2.0') {
                s.line(` - ${camelCase(scheme.name)}`)
            }
        }

        s.line('```')
    }

    s.multiline(`
#### Base URI

You can override the base URI by setting the \`baseUri\` property, or initializing a request builder with a base URI. For example:

\`\`\`php
$builder =  new RequestBuilder(['baseUri' => 'http://google.com/search']);
\`\`\`

### Methods

All methods return a HTTP request instance of Guzzle [PSR-7](https://github.com/guzzle/psr7).
`)

    for (const resource of allResources(api)) {
        for (const method of resource.methods) {
            s.line(`#### ${getDisplayName(method, resource)}`)
            s.line()

            if (Object.keys(resource.uriParameters).length) {
                s.line(getUriParametersSnippet(resource))
                s.line()
            }

            if (method.description) {
                s.multiline(method.description.trim())
                s.line()
            }

            s.multiline(`\`\`\`php
$builder =  new RequestBuilder();
$request = $builder->${getRequestSnippet(method, resource)};
$response = $client->send($request);
\`\`\`
  `)
        }
    }

    s.line('## License')
    s.line()
    s.line('MIT')

    return s.toString()
}
