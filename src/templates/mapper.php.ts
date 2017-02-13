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
}`);

    return s.toString();
}
