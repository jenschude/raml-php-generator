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


export default function (api:any, data: any):string {
    const s = new Strands();
    const apiTypes = api.types ? api.types : [];
    const apiType = data.type ? data.type : [];
    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${toNamespace(api.title)}\\Model;
`);

    const displayNames = getDisplayNames(apiTypes);
    const discriminatorList = getDiscriminatorTypes(apiTypes);
    createCollection(apiType);

    function getDisplayNames(types: any) {
        const displayNames:any = {};
        if (types) {
            for (const key of Object.keys(types)) {
                const typeDef = types[key];
                const typeName = Object.keys(typeDef)[0];
                const type = typeDef[typeName];
                displayNames[typeName] = type.displayName;
            }
        }
        return displayNames;
    }

    function createCollection(type:any) {
        const instanceClass = type.displayName;
        const discriminatorClass = discriminatorList[type.displayName] ? true : false;

        s.multiline(`class ${type.displayName}Collection extends Collection {`);
        s.multiline(`
    /**
     * @param $index
     * @return ${instanceClass}|null
     */
    public function at($index)
    {
        if (!isset($this->data[$index])) {
            $data = $this->raw($index);
            if (!is_null($data)) {`);
        if (discriminatorClass) {
            s.line(`                $data = Mapper::map($data, ${instanceClass}::resolveDiscriminatorClass($data));`);
        } else {
            s.line(`                $data = Mapper::map($data, ${instanceClass}::class);`);
        }
        s.multiline(`            }
            $this->data[$index] = $data;
        }
        return $this->data[$index];
    }
    
    /**
     * @return ${instanceClass}|null
     */
    public function current()
    {
        return parent::current();
    }`);
        s.multiline(`}`);
    }

    function getDiscriminatorTypes(types: any) {
        const discriminatorTypes:any = {};
        if (types) {
            for (const key of Object.keys(types)) {
                const typeDef = types[key];
                const typeName = Object.keys(typeDef)[0];
                const type = typeDef[typeName];
                const displayName = displayNames[type.type];
                if (type.discriminatorValue) {
                    if (!discriminatorTypes[displayName]) {
                        discriminatorTypes[displayName] = [];
                    }
                    discriminatorTypes[displayName].push({ discriminatorValue: type.discriminatorValue, type: type.displayName });
                }
            }
        }
        return discriminatorTypes;
    }

    return s.toString();
}
