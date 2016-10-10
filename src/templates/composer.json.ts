import paramCase = require('param-case')
import pascalCase = require('pascal-case')
import stringify = require('javascript-stringify')
import {Api} from 'raml-generator'

import {hasSecurity} from '../support/api'

import {
    supportStrictTypes as st
} from '../support/feature'


export default function (api:any) {
    let namespace:any = {};
    namespace[pascalCase(api.title) + '\\'] = "src/";
    return `${JSON.stringify({
        name: paramCase(api.title),
        description: api.description,
        autoload: {
            files: [
                "classes.php"
            ],
            "psr-4": namespace
        },
        require: {
            php: st() ? '>=7.0': '>=5.6',
            "guzzlehttp/guzzle": "^6.0",
            "league/oauth2-client": "^1.4",
            "guzzlehttp/psr7": "^1.1",
            "psr/cache": "^1.0",
            "cache/adapter-common": "^0.3",
            "cache/filesystem-adapter": "^0.3"
        }
    }, null, 2)}\n`
}
