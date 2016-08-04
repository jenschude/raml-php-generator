import {Strands} from 'strands'
import {Api} from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import stringify = require('javascript-stringify')

import {getDefaultParameters} from '../support/parameters'
import {
    hasSecurity,
    getSecuritySchemes,
    allResources,
    nestedResources,
    NestedMethod,
    NestedResource
} from '../support/api'
import {isQueryMethod} from '../support/method'
import {
    supportStrictTypes as st
} from '../support/feature'

export default function (api:any):string {
    const s = new Strands();
    const flatTree = allResources(api); // For short-hand annotations.
    const nestedTree = nestedResources(api);
    const {withParams, noParams} = separateChildren(nestedTree);
    const supportedSecuritySchemes = getSecuritySchemes(api).filter(x => x.type === 'OAuth 2.0');

    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${pascalCase(api.title)};

use GuzzleHttp\\Psr7\\Request;
use Psr\\Http\\Message\\RequestInterface;

class Resource
{
    const TEMPLATE_REGEXP = '/\\{([^\\{\\}]+)\\}/';

    /**
     * @param  ${st() ? 'string ':''} $string
     * @param  mixed $interpolate
     * @param  mixed $defaults
     * @return string
     */
    final protected function template(${st() ? 'string ':''}$string, array $interpolate = [], array $defaults = [])${st() ? ': string':''} {
        return (string)preg_replace_callback(static::TEMPLATE_REGEXP, function ($matches) use ($defaults, $interpolate) {
            $key = $matches[1];
            if (isset($interpolate[$key]) && $interpolate[$key] != null) {
                return urlencode($interpolate[$key]);
            }

            if (isset($defaults[$key]) && $defaults[$key] != null) {
                return urlencode($defaults[$key]);
            }

            return '';
        }, $string);
    }

    private $uri;

    public function __construct(${st() ? 'string ':''} $uri)
    {
        $this->uri = $uri;
    }

    final protected function getUri()${st() ? ': string':''}
    {
        return $this->uri;
    }

    /**
     * @param $method
     * @param $uri
     * @param mixed $body
     * @param array $options
     * @return RequestInterface
     */
    final protected function buildRequest(${st() ? 'string ':''} $method, ${st() ? 'string ':''} $uri, $body = null, array $options = [])${st() ? ': RequestInterface':''}
    {
        $headers = isset($options['headers']) ? $options['headers'] : [];
        $request = new Request($method, $uri, $headers, $body);

        if (isset($options['query'])) {
            $params = [];
            foreach ($options['query'] as $key => $value) {
                if (!is_array($value)) {
                    $param = new Parameter($key, $value);
                    $params[$param->getId()] = $param;
                } else {
                    foreach ($value as $data) {
                        $param = new MultiParameter($key, $data);
                        $params[$param->getId()] = $param;
                    }
                }
            }
            $params = array_map(
                function ($param) {
                    return (string)$param;
                },
                $params
            );
            sort($params);
            $query = implode('&', $params);
            $uri = $request->getUri()->withQuery($query);
            $request = $request->withUri($uri);
        }
        

        return $request;
    }
}

class Parameter
{
    protected $key;
    protected $value;

    public function __construct($key, $value = null)
    {
        if (empty($key)) {
            throw new \\InvalidArgumentException('no key given');
        }
        $this->key = $key;
        $this->value = $value;
    }

    public function getId()
    {
        return $this->key;
    }

    public function getValue()
    {
        return $this->value;
    }

    public function __toString()
    {
        $value = $this->getValue();
        if (is_null($value)) {
            $paramStr = $this->key;
        } elseif (is_bool($value)) {
            $paramStr = $this->key . '=' . ($value ? 'true' : 'false');
        } else {
            $paramStr = $this->key . '=' . urlencode((string)$value);
        }

        return $paramStr;
    }
}

class MultiParameter extends Parameter
{
    public function getId()
    {
        return $this->__toString();
    }
}

class RequestBuilder extends Resource
{
    public function __construct($options = [])
    {
        $baseUriParameters = [];
        if (isset($options['baseUriParameters'])) {
            $baseUriParameters = $options['baseUriParameters'];
        }
        if (isset($options['baseUri'])) {
            $baseUri = $this->template($options['baseUri'], $baseUriParameters);
        } else {
            $baseUri = $this->template(${stringify(api.baseUri)}, ${getDefaultValueArray(api.baseUriParameters)});
        }
        parent::__construct(trim($baseUri, '/'));
    }
    
    final public function buildCustom(${st() ? 'string ':''} $method, ${st() ? 'string ':''} $uri, $body = null, array $options = [])${st() ? ': RequestInterface':''}
    {
        if (isset($options['uriParameters'])) {
            $uri = $this->template($this->getUri() . $uri, $options['uriParameters']);
            unset($options['uriParams']);
        } else {
            $uri = $this->getUri() . $uri;
        }
        return $this->buildRequest($method, $uri, $body, $options);
    }
`);

    createRootResource(nestedTree);
    s.multiline(`
}`);

    createChildren(nestedTree.children);

    // Interface for mapped nested resources.
    interface KeyedNestedResources {
        [key:string]:NestedResource
    }

    // Create prototype methods.
    function createProtoMethods(methods:NestedMethod[], id:string, resource: any) {
        for (const method of methods) {
            const headers = getDefaultParameters(method.headers);
            const type = isQueryMethod(method) ? 'query' : 'body';

            if (type == 'query') {
                s.line(`    public function ${camelCase(method.method)} (array $query = [], array $options = [])${st() ? ': RequestInterface':''} {`);
                s.line(`${setDefaultHeader(method.headers)}`);
                s.multiline(`
        if (isset($options['query'])) {        
            $query = array_merge($options['query'], $query);
        }
        $options['query'] = $query;`);
                s.line(`        return $this->buildRequest(${stringify(method.method)}, $this->getUri(), null, $options);`)
            } else {
                s.line(`    public function ${camelCase(method.method)} ($body = null, array $options = [])${st() ? ': RequestInterface':''} {`);
                s.line(`${setDefaultHeader(method.headers)}`);
                s.line(`        return $this->buildRequest(${stringify(method.method)}, $this->getUri(), $body, $options);`)
            }
            s.line(`    }`)
        }
    }

    function setDefaultHeader(headers:any) {
        const defaultHeader:any = [];
        if (headers) {
            for (const key of Object.keys(headers)) {
                const header:any = headers[key];
                defaultHeader.push(`        if (!isset($options['headers'][${stringify(key.toLowerCase())}]) && !isset($options['headers'][${stringify(key.toUpperCase())}])) {
            $options['headers'][${stringify(key.toLowerCase())}] = ${stringify(header.default)};
        }`);
            }
        }
        return defaultHeader.join(`\n`);
    }

    // Split children by "type" of method that needs to be created.
    function separateChildren(resource:NestedResource) {
        const withParams:KeyedNestedResources = {};
        const noParams:KeyedNestedResources = {};

        // Split apart children types.
        for (const key of Object.keys(resource.children)) {
            const child = resource.children[key];

            if (Object.keys(child.uriParameters).length) {
                withParams[child.methodName] = child
            } else {
                noParams[child.methodName] = child
            }
        }

        return {withParams, noParams}
    }

    function toParamsFunction(child:NestedResource) {
        return `${setDefaultValues(child.uriParameters)}
        $uri = $this->template($this->getUri() . ${stringify(child.relativeUri)}, ${toArray(child.uriParameters)});
        return new ${child.id}($uri);`
    }

    function getDefaultValueArray(parameters:any) {
        const params:any = [];
        if (parameters) {
            for (const key of Object.keys(parameters)) {
                const parameter:any = parameters[key];
                if (parameter.default) {
                    params.push(`${stringify(key)} => ${stringify(parameter.default)}`);
                }
            }
        }
        return `[` + params.join(`,\n`) + `]`;
    }

    function setDefaultValues(parameters:any) {
        const params:any = [];
        if (parameters) {
            for (const key of Object.keys(parameters)) {
                const parameter:any = parameters[key];
                if (parameter.default) {
                    params.push(`        if (is_null($${key})) { $${key} = ${stringify(parameter.default)}; }`);
                }
            }
        }
        return params.join(`\n`);
    }

    function toArray(parameters:any) {
        const params:any = [];
        if (parameters) {
            for (const key of Object.keys(parameters)) {
                params.push(`'${key}' => $${key}`);
            }
        }
        return `[` + params.join(`, `) + `]`;
    }

    function toUriParameters(parameters:any) {
        const params:any = [];
        if (parameters) {
            for (const key of Object.keys(parameters)) {
                const parameter:any = parameters[key];
                if (parameter.default) {
                    params.push(`$${key} = ${stringify(parameter.default)}`);
                } else {
                    params.push(`$${key}`);
                }
            }
        }
        return params.join(`, `);
    }

    // Create prototype resources.
    function createProtoResources(withParams:KeyedNestedResources, noParams:KeyedNestedResources, id:string) {
        for (const key of Object.keys(withParams)) {
            const child = withParams[key];

            // Skip inlined entries.
            if (noParams[key] != null) {
                continue
            }
            s.line(`    public function with${pascalCase(child.methodName)} (${toUriParameters(child.uriParameters)})${st() ? ': ' + child.id :''} {
      ${toParamsFunction(child)}
    }`);
        }
    }

    // Create nested resource instances.
    function createRootResource(resource:NestedResource) {
        const {withParams, noParams} = separateChildren(resource);

        createThisResources(withParams, noParams);

        createProtoMethods(resource.methods, resource.id, resource);
        createProtoResources(withParams, noParams, resource.id);
    }

    // Create nested resource instances.
    function createResource(resource:NestedResource) {
        const {withParams, noParams} = separateChildren(resource);

        s.line(`final class ${resource.id} extends Resource {`);

        createThisResources(withParams, noParams);

        createProtoMethods(resource.methods, resource.id, resource);
        createProtoResources(withParams, noParams, resource.id);

        s.line(`}`);

        createChildren(resource.children);
    }

    // Generate all children.
    function createChildren(children:KeyedNestedResources) {
        for (const key of Object.keys(children)) {
            createResource(children[key]);
        }
    }

    function createThisResources(withParams:KeyedNestedResources, noParams:KeyedNestedResources) {
        for (const key of Object.keys(noParams)) {
            const child = noParams[key];
            const constructor = `new ${child.id}($this->getUri() . ${stringify(child.relativeUri)})`;

            if (!(withParams[key] == null)) {
                s.multiline(`    public function with${pascalCase(child.methodName)} (${toUriParameters(withParams[key].uriParameters)})${st() ? ': ' + child.id :''} {
        ${toParamsFunction(withParams[key])}
    }`);
            }
            s.multiline(`    public function ${child.methodName}()${st() ? ': ' + child.id :''} {
        return ${constructor};
    }`);
        }
    }

    return s.toString();
}
