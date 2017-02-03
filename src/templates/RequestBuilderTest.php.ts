import {Strands} from 'strands'
import {Api} from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import stringify = require('javascript-stringify')

import {getTestRequestSnippet} from '../support/method'
import {
    allResources,
} from '../support/api'
import {
    supportStrictTypes as st, toNamespace
} from '../support/feature'

export default function (api:any):string {
    const s = new Strands();
    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${toNamespace(api.title)}\\Tests;

use ${toNamespace(api.title)}\\RequestBuilder;
use PHPUnit\\Framework\\TestCase;
use Psr\\Http\\Message\\RequestInterface;

`);


    s.multiline(`
class RequestBuilderTest extends TestCase
{
    public function getRequests()
    {
        return [`);
    for (const resource of allResources(api)) {
        for (const method of resource.methods) {
            s.multiline(`            [
                function(RequestBuilder $builder)${st() ? ': RequestInterface': ''} {
                    return $builder->${getTestRequestSnippet(method, resource)};
                },
                '${method.method.toUpperCase()}',
                '${resource.relativeUri}',
            ],`)
        }
    }
    s.multiline(`
        ];
    }
    
    /**
     * @dataProvider getRequests()
     */
    public function testBuilder(callable $builderFunction, ${st() ? 'string ': ''}$method, ${st() ? 'string ': ''}$relativeUri)
    {
        $builder = new RequestBuilder();
        $request = $builderFunction($builder);
        
        $this->assertSame($method, $request->getMethod());
        $this->assertContains(str_replace(['{', '}'], '', $relativeUri), (string)$request->getUri());
        $this->assertSame($method . ' ' . $relativeUri, $request::API_PATH);
    }
}`);

    return s.toString();
}
