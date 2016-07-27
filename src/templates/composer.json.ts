import paramCase = require('param-case')
import {Api} from 'raml-generator'

import {hasSecurity} from '../support/api'

export default function (api:any) {
    return `${JSON.stringify({
        name: paramCase(api.title),
        version: '0.0.0',
        description: api.description,
        autoload: {
            files: [
                "index.php"
            ]
        },
        require: {
            php: ">=5.4",
            "guzzlehttp/psr7": "^1.1",
        }
    }, null, 2)}\n`
}
