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

    const displayNames = data.displayNames;
    const discriminatorList = data.discriminatorList;
    createCollection(apiType);


    function createCollection(type:any) {
        const instanceClass = type.name;
        const discriminatorClass = !!discriminatorList[type.name];

        s.multiline(`class ${type.name}Collection extends Collection {`);
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

    return s.toString();
}
