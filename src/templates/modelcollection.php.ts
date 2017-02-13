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
    createCollection(apiType);

    function getDisplayNames(types: any) {
        let displayNames:any = {};
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
        s.multiline(`class ${type.displayName}Collection extends Collection {`);
        s.multiline(`
    /**
     * @param $index
     * @return ${type.displayName}|null
     */
    public function at($index)
    {
        if (!isset($this->data[$index])) {
            $data = $this->raw($index);
            if (!is_null($data)) {
                $data = new ${type.displayName}($data);
            }
            $this->data[$index] = $data;
        }
        return $this->data[$index];
    }
    
    /**
     * @return ${type.displayName}|null
     */
    public function current()
    {
        return parent::current();
    }`);
        s.multiline(`}`);
    }

    function getReturnType(property:any): string
    {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : '';
        if (overrideType) {
            const arrayType = overrideType.structuredValue.includes('[]');
            const itemType = overrideType.structuredValue.replace('[]', '');
            const overrideProperty = {
                displayName: property.displayName,
                type: arrayType ? ['array'] : [overrideType],
                items: arrayType ? itemType : null
            };
            return getReturnType(overrideProperty);
        }
        const propertyType = property.type.length == 1 ? property.type[0] : '';
        switch (propertyType) {
            case 'string':
                return 'string';
            case 'boolean':
                return 'bool';
            case 'integer':
                return 'int';
            case 'number':
                return 'float';
            case 'datetime':
            case 'date-only':
            case 'time-only':
            case 'datetime-only':
                return '\\DateTimeImmutable';
            case 'array':
                if (property.items && displayNames[property.items]) {
                    return `${displayNames[property.items]}Collection`;
                } else {
                    return `array`;
                }
            case 'object':
                return `array`;
            default:
                const instanceClass = displayNames[propertyType] ? displayNames[propertyType] : '';
                if (instanceClass) {
                    return `${instanceClass}`;
                }
                return `array`;
        }
    }

    function getMapping(property:any): string
    {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : '';
        if (overrideType) {
            const arrayType = overrideType.structuredValue.includes('[]');
            const itemType = overrideType.structuredValue.replace('[]', '');
            const overrideProperty = {
                displayName: property.displayName,
                type: arrayType ? ['array'] : [overrideType],
                items: arrayType ? itemType : null
            };
            return getMapping(overrideProperty);
        }
        const propertyType = property.type.length >= 1 ? property.type[0] : '';
        const instanceClass = displayNames[propertyType] ? displayNames[propertyType] : '';
        switch (propertyType) {
            case 'string':
                return `$this->${property.displayName} = (string)$value;`;
            case 'boolean':
                return `$this->${property.displayName} = (bool)$value;`;
            case 'integer':
                return `$this->${property.displayName} = (int)$value;`;
            case 'number':
                return `$this->${property.displayName} = (float)$value;`;
            case 'datetime':
            case 'date-only':
            case 'time-only':
            case 'datetime-only':
                return `$this->${property.displayName} = new \\DateTimeImmutable($value);`;
            case 'array':
                if (property.items && displayNames[property.items]) {
                    return `$this->${property.displayName} = Mapper::map($value, ${displayNames[property.items]}Collection::class);`;
                } else {
                    return `$this->${property.displayName} = $value;`;
                }
            case 'object':
                return `$this->${property.displayName} = $value;`;
            default:
                if (instanceClass) {
                    return `$this->${property.displayName} = Mapper::map($value, ${instanceClass}::class);`;
                }
                return `$this->${property.displayName} = $value;`;
        }
    }

    function getEmptyMapping(property: any): string
    {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : false;
        if (overrideType) {
            const arrayType = overrideType.structuredValue.includes('[]');
            const itemType = overrideType.structuredValue.replace('[]', '');
            const overrideProperty = {
                displayName: property.displayName,
                type: arrayType ? ['array'] : [overrideType],
                items: arrayType ? itemType : null
            };
            return getEmptyMapping(overrideProperty);
        }
        const propertyType = property.type.length >= 1 ? property.type[0] : '';
        const instanceClass = displayNames[propertyType] ? displayNames[propertyType] : '';
        switch (propertyType) {
            case 'string':
                return `return '';`;
            case 'boolean':
                return `return false;`;
            case 'integer':
                return `return 0;`;
            case 'number':
                return `return 0;`;
            case 'datetime':
            case 'date-only':
            case 'time-only':
            case 'datetime-only':
                return `return new \\DateTimeImmutable();`;
            case 'object':
                return `return [];`;
            case 'array':
                if (property.items && displayNames[property.items]) {
                    return `return Mapper::map([], ${displayNames[property.items]}Collection::class);`;
                } else {
                    return `return [];`;
                }
            default:
                if (instanceClass) {
                    return `return Mapper::map([], ${instanceClass}::class);`;
                }
                return 'return [];';
        }
    }

    return s.toString();
}
