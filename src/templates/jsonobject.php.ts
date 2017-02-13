import {Strands} from 'strands'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import upperCaseFirst = require('upper-case-first')
import stringify = require('javascript-stringify')
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

    public function __construct(array $data = [])
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
`);
    return s.toString();
}
