import {Strands} from 'strands'
import {Api} from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import upperCaseFirst = require('upper-case-first')
import stringify = require('javascript-stringify')
import { hasSecurity, getSecuritySchemes, allResources, nestedResources, NestedMethod, NestedResource } from '../support/api'
import {
    supportStrictTypes as st, toNamespace
} from '../support/feature'


export default function (api:any):string {
    const s = new Strands();
    const apiTypes = api.types ? api.types : [];
    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${toNamespace(api.title)}\\Model;

class HydratorGenerator {
    protected static $types = [`);
        for (const key of Object.keys(apiTypes)) {
            const typeDef = apiTypes[key];
            const typeName = Object.keys(typeDef)[0];
            const type = typeDef[typeName];
            createHydratorMap(type);
        }
        s.multiline(`    ];
        
    public function getHydratorClass($className)
    {
        $hydratorClass = null;
        if (isset(self::$types[$className])) {
            $hydratorClass = self::$types[$className];
        }
        return $hydratorClass;
    }
}`);

    function createHydratorMap(type:any) {
        s.line(`       ${type.name}::class => ${type.name}::class,`);
        if (type.annotations && type.annotations['generate-collection']) {
            s.line(`       ${type.name + 'Collection'}::class => ${type.name}Collection::class,`);
        }
    }

    return s.toString();
}
