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

    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${toNamespace(api.title)}\\Model;

use Zend\\Hydrator\\HydrationInterface;

class JsonObject implements \\JsonSerializable, HydrationInterface
{
    private $rawData;

    public function __construct(array $data =[])
    {
        $this->rawData = $data;
    }

    protected function raw($field)
    {
        if (isset($this->rawData[$field])) {
            return $this->rawData[$field];
        }
        return null;
    }

    public function jsonSerialize()
    {
        return $this->toArray();
    }

    /**
     * @inheritdoc
     */
    public static function fromArray(array $data)
    {
        return new static($data);
    }

    /**
     * @inheritdoc
     */
    public function toArray()
    {
        $data = array_filter(
            get_object_vars($this),
            function ($value, $key) {
                if ($key == 'rawData') {
                    return false;
                }
                return !is_null($value);
            },
            ARRAY_FILTER_USE_BOTH
        );
        $data = array_merge($this->rawData, $data);
        return $data;
    }
    
    public function hydrate(array $data, $object)
    {
        $object->rawData = $data;
    }
}

class Collection implements \\Iterator, \\Countable, \\JsonSerializable, HydrationInterface
{
    private $rawData;

    /**
     * @var array
     */
    private $keys = array();

    /**
     * @var int
     */
    private $pos = 0;

    private $indexes = [];

    protected $data = [];

    public function __construct(array $data =[])
    {
        $this->initialize($data);
    }
    
    private function initialize(array $data)
    {
        $this->indexes = [];
        $this->pos = 0;
        $this->keys = array_keys($data);
        $this->index($data);
        $this->rawData = $data;
    }

    protected function raw($field)
    {
        if (isset($this->rawData[$field])) {
            return $this->rawData[$field];
        }
        return null;
    }

    protected function rawSet($field, $data)
    {
        if (!is_null($field)) {
            $this->rawData[$field] = $data;
        } else {
            $this->rawData[] = $data;
        }
    }

    public function jsonSerialize()
    {
        return $this->toArray();
    }

    /**
     * @inheritdoc
     */
    public static function fromArray(array $data)
    {
        return new static($data);
    }

    /**
     * @inheritdoc
     */
    public function toArray()
    {
        return $this->rawData;
    }

    protected function index($data)
    {
    }

    protected function addToIndex($index, $key, $value)
    {
        $this->indexes[$index][$key] = $value;
    }

    protected function valueByKey($index, $key)
    {
        return isset($this->indexes[$index][$key]) ? $this->at($this->indexes[$index][$key]) : null;
    }

    /**
     * @inheritDoc
     */
    public function current()
    {
        if (isset($this->keys[$this->pos])) {
            return $this->at($this->keys[$this->pos]);
        }
        return null;
    }
    
    public function at($index)
    {
        return $this->raw($index);
    }

    /**
     * @inheritDoc
     */
    public function next()
    {
        $this->pos++;
    }

    /**
     * @inheritDoc
     */
    public function key()
    {
        if ($this->valid()) {
            return $this->keys[$this->pos];
        }
        return null;
    }

    /**
     * @inheritDoc
     */
    public function valid()
    {
        return isset($this->keys[$this->pos]);
    }

    /**
     * @inheritDoc
     */
    public function rewind()
    {
        $this->pos = 0;
    }

    /**
     * @inheritDoc
     */
    public function count()
    {
        return count($this->keys);
    }
    
    public function hydrate(array $data, $object)
    {
        $object->initialize($data);
    }
}
`);

    const displayNames = getDisplayNames(api.types);
    const discriminatorList = getDiscriminatorTypes(api.types);
    createModels(api.types);

    createCollections(api.types);

    createMapper(api.types);

    function getDisplayNames(types: any) {
        let displayNames:any = {};
        for (const key of Object.keys(types)) {
            const typeDef = types[key];
            const typeName = Object.keys(typeDef)[0];
            const type = typeDef[typeName];
            displayNames[typeName] = type.displayName;
        }
        return displayNames;
    }

    function getDiscriminatorTypes(types: any) {
        let discriminatorTypes:any = {};
        for (const key of Object.keys(types)) {
            const typeDef = types[key];
            const typeName = Object.keys(typeDef)[0];
            const type = typeDef[typeName];

            if (type.discriminator) {
                if (!discriminatorTypes[type.displayName]) {
                    discriminatorTypes[type.displayName] = { list : [] };
                }
                discriminatorTypes[type.displayName].discriminator = type.discriminator;
            }
            if (type.discriminatorValue) {
                if (!discriminatorTypes[type.type]) {
                    discriminatorTypes[type.type] = { list : [] };
                }
                discriminatorTypes[type.type].list.push({ discriminatorValue: type.discriminatorValue, type: type.displayName });
            }
        }
        return discriminatorTypes;
    }


    function createModels(types:any) {
        for (const key of Object.keys(types)) {
            const typeDef = types[key];
            const typeName = Object.keys(typeDef)[0];
            const type = typeDef[typeName];
            createModel(type);
        }
    }

    function createCollections(types:any) {
        for (const key of Object.keys(types)) {
            const typeDef = types[key];
            const typeName = Object.keys(typeDef)[0];
            const type = typeDef[typeName];
            if (type.annotations && type.annotations['generate-collection']) {
                createCollection(type);
            }
        }
    }

    function createMapper(types:any) {
        s.multiline(`
class Mapper
{
    private static $instance;
   
    private $generator; 
    
    
    private static function getInstance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function getHydrator($className)
    {
        if (is_null($this->generator)) {
            $this->setGenerator(function ($className) {
                $generator = new HydratorGenerator();
                $hydratorClass = $generator->getHydratorClass($className);
                return new $hydratorClass();
            });
        }
        $generator = $this->generator;
        return $generator($className);
    }
    
    public function setGenerator(callable $fn)
    {
        $this->generator = $fn;
    }
    
    public function mapToClass($value, $className)
    {
        if (!is_null($className)) {
            $hydrator = $this->getHydrator($className);
            $object = new $className();
            $hydrator->hydrate($value, $object);
        } else {
            $object = $value;
        }
        
        return $object;
    }
    
    public static function map($value, $className)
    {
        return self::getInstance()->mapToClass($value, $className);
    }
}

class HydratorGenerator {
    protected static $types = [`);
        for (const key of Object.keys(types)) {
            const typeDef = types[key];
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
    }

    function createHydratorMap(type:any) {
        s.line(`       ${type.displayName}::class => ${type.displayName}::class,`);
        if (type.annotations && type.annotations['generate-collection']) {
            s.line(`       ${type.displayName + 'Collection'}::class => ${type.displayName}Collection::class,`);
        }
    }

    function createDiscriminatorMap(type:any, discriminatorTypes:any) {
        s.line(`        ${type.displayName}::class => [`);
        for (const type of discriminatorTypes) {
            s.line(`            ${stringify(type.discriminatorValue)} => ${type.type}::class,`);

        }
        s.line(`        ],`);
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

    function getReturnType(property:any) {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : '';
        if (overrideType) {
            return `${overrideType.structuredValue}`;
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

    function getMapping(property:any)
    {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : '';
        if (overrideType) {
            return `return Mapper::map($value, ${overrideType.structuredValue}::class);`;
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
                    if (discriminatorList[instanceClass]) {

                    }
                    return `$this->${property.displayName} = Mapper::map($value, ${instanceClass}::class);`;
                }
                return `$this->${property.displayName} = $value;`;
        }
    }

    function getEmptyMapping(property: any)
    {
        const overrideType = property.annotations && property.annotations['generator-type'] ? property.annotations['generator-type'] : '';
        if (overrideType) {
            return `return Mapper::map([], ${overrideType.structuredValue}::class);`
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

    function createModel(type:any) {
        let extendedType = type.type.length == 1 && displayNames[type.type[0]] ? displayNames[type.type[0]] : 'JsonObject';
        if (type.annotations && type.annotations['generator-ignore']) {
            return;
        }
        if (type.annotations && type.annotations['generator-type']) {
            extendedType = type.annotations['generator-type'].structuredValue;
        }
        s.line(`class ${type.displayName}${extendedType ? ` extends ${extendedType}` : ''} {`);
        if (type.properties) {
            for(const key of Object.keys(type.properties)) {
                const property = type.properties[key];
                if (property.displayName[0] == '/') {
                    continue;
                }
                s.line(`    protected $${property.displayName};`);
            }
            for(const key of Object.keys(type.properties)) {
                const property = type.properties[key];
                if (property.displayName[0] == '/') {
                    continue;
                }
                const ignoreSt = property.annotations && property.annotations['generator-ignore-strict'] ? true: false;
                s.multiline(`
    /**
     * @return ${getReturnType(property)}
     */
    public function get${upperCaseFirst(property.displayName)}()${st() && !ignoreSt ? `: ${getReturnType(property)}` : ''}
    {
        if (is_null($this->${property.displayName})) {
            $value = $this->raw('${property.displayName}');
            if (!is_null($value)) {
                ${getMapping(property)}
            } else {
                ${getEmptyMapping(property)}
            }
        }
        return $this->${property.displayName};
    }
                `);
            }
        }
        s.line(`}`);
    }
    return s.toString();
}
