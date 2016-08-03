import paramCase = require('param-case')
import {Api} from 'raml-generator'

import {hasSecurity} from '../support/api'

import {
    supportStrictTypes as st
} from '../support/feature'

export default function (api:any) {
    return `${JSON.stringify({
        name: paramCase(api.title),
        description: api.description,
        autoload: {
            files: [
                "index.php"
            ]
        },
        require: {
            php: st() ? '>=7.0': '>=5.4',
            "guzzlehttp/psr7": "^1.1",
        }
    }, null, 2)}\n`
}
