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
    supportStrictTypes as st, isKeyword, toNamespace
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
namespace ${toNamespace(api.title)};

use GuzzleHttp\\Psr7\\Request;
use GuzzleHttp\\Psr7\\Uri;
use GuzzleHttp\\Psr7;
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
                return urlencode((string)$interpolate[$key]);
            }

            if (isset($defaults[$key]) && $defaults[$key] != null) {
                return urlencode((string)$defaults[$key]);
            }

            return '';
        }, $string);
    }

    private $uri;

    public function __construct(${st() ? 'string ':''} $uri)
    {
        $this->uri = $uri;
    }

    /**
     * @return string
     */
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
    final protected function buildRequest(${st() ? 'string ':''} $method, ${st() ? 'string ':''} $uri, $body = null, array $options = [], $requestClass = ApiRequest::class)${st() ? ': RequestInterface':''}
    {
        $headers = isset($options['headers']) ? $options['headers'] : [];
        /**
         * @var RequestInterface $request
         */
        $request = new $requestClass($method, $uri, $headers, $body);

        if (isset($options['query'])) {
            ksort($options['query']);
            $uri = $request->getUri()->withQuery(Psr7\\build_query($options['query']));
            $request = $request->withUri($uri);
        }
        

        return $request;
    }
}

class ApiRequest extends Request {
    const API_PATH = '';
}

class RequestBuilder extends Resource
{
    /**
     * @param array $options
     */
    public function __construct(array $options = [])
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
    
    /**
     * @param string $method
     * @param string $uri
     * @param null $body
     * @param array $options
     * @return RequestInterface
     */
    final public function buildCustom(${st() ? 'string':''} $method, ${st() ? 'string':''} $uri, $body = null, array $options = [])${st() ? ': RequestInterface':''}
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

    createRequests(nestedTree, '');
    createChildren(nestedTree.children, nestedTree.methodName);

    // Interface for mapped nested resources.
    interface KeyedNestedResources {
        [key:string]:NestedResource
    }

    // Create prototype methods.
    function createProtoMethods(methods:NestedMethod[], id:string, resource: any) {
        for (const method of methods) {
            const headers = getDefaultParameters(method.headers);
            const type = isQueryMethod(method) ? 'query' : 'body';
            const requestName = resource.id + pascalCase(method.method) + 'Request';
            const returnType = requestName;
            if (type == 'query') {
                s.multiline(`
    /**
     * @param $query
     * @param array $options
     * @return ${returnType}
     */`);
                s.line(`    public function ${camelCase(method.method)}($query = null, array $options = [])${st() ? ': ' + returnType:''} {`);
                s.line(`${setDefaultHeader(method.headers)}`);
                s.multiline(`
        if (!is_array($query)) {
            $query = Psr7\\parse_query($query);
        }
        if (isset($options['query'])) {        
            $query = array_merge($options['query'], $query);
        }
        $options['query'] = $query;`);
                s.line(`        return $this->buildRequest(${stringify(method.method)}, $this->getUri(), null, $options, ${requestName}::class);`)
            } else {
                s.multiline(`
    /**
     * @param $body
     * @param array $options
     * @return ${returnType}
     */`);
                s.line(`    public function ${camelCase(method.method)}($body = null, array $options = [])${st() ? ': ' + returnType:''} {`);
                s.line(`${setDefaultHeader(method.headers)}`);
                s.line(`        return $this->buildRequest(${stringify(method.method)}, $this->getUri(), $body, $options, ${requestName}::class);`)
            }
            s.line(`    }`)
        }
    }

    function setDefaultHeader(headers:any) {
        const defaultHeader:any = [];
        if (headers) {
            for (const key of Object.keys(headers)) {
                const header:any = headers[key];
                if (header.default) {
                    defaultHeader.push(`        if (!isset($options['headers'][${stringify(key.toLowerCase())}]) && !isset($options['headers'][${stringify(key.toUpperCase())}])) {
            $options['headers'][${stringify(key.toLowerCase())}] = ${stringify(header.default)};
        }`);
                }
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

    function toArgumentArray(parameters:any, position = 1) {
        const params:any = [];
        if (parameters) {
            parameters.forEach(function (parameter: any) {
                params.push(`$${parameter[position]}`);
            });
        }
        return params.join(`, `);
    }

    function toPatternArray(parameters:any, position = 0) {
        const params:any = [];
        if (parameters) {
            parameters.forEach(function (parameter: any) {
                params.push(`${stringify('/' + parameter[position] + '/')}`);
            });
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
            s.multiline(`
    /**`);
            for(const parameter of Object.keys(child.uriParameters)) {
                s.line(`     * @param $${parameter}`)
            }
            s.multiline(`     * @return ${child.id}
     */
    public function with${pascalCase(child.methodName)}(${toUriParameters(child.uriParameters)})${st() ? ': ' + child.id :''} {
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
    function createResource(resource:NestedResource, path: string) {
        const {withParams, noParams} = separateChildren(resource);
        const localPath = path ? path + resource.relativeUri : resource.relativeUri;

        s.line(`final class ${resource.id} extends Resource {`);
        s.line(`    const API_PATH='${localPath}';`);

        createThisResources(withParams, noParams);

        createProtoMethods(resource.methods, resource.id, resource);
        createProtoResources(withParams, noParams, resource.id);

        s.line(`}`);

        createRequests(resource, localPath);

        createChildren(resource.children, localPath);
    }

    function createRequests(resource:NestedResource, path: string) {
        for (const method of resource.methods) {
            const localPath = path ? method.method.toUpperCase() + ' ' + path : method.method.toUpperCase();
            const requestName = resource.id + pascalCase(method.method) + 'Request';
            s.multiline(`final class ${requestName} extends ApiRequest {
    const API_PATH = '${localPath}';`);
            if (method.queryParameters) {
                s.multiline(`
    private $query;
    private $queryParts;`);

                for (const key of Object.keys(method.queryParameters)) {
                    const parameter = method.queryParameters[key];
                    const result = parameter.name.match(/<<([^>]*)>>/g);
                    let placeHolders:any = [];
                    if (result && result.length > 0) {
                        result.forEach(
                            function (entry:string) {
                                placeHolders.push(entry.match('<<([^>]*)>>'));
                            }
                        );
                    }
                    s.multiline(`
    /**`);
                    for (const placeHolder of placeHolders) {
                        s.line(`     * @param $${placeHolder[1]}`)
                    }

                    s.multiline(`     * @param $${camelCase(parameter.name)}
     * @return ${requestName}
     */
    public function with${pascalCase(parameter.name)}(${placeHolders.length > 0 ? toArgumentArray(placeHolders) + ', ' : ''}$${camelCase(parameter.name)})${st() ? ': ' + requestName : ''} {
        $query = $this->getUri()->getQuery();
        if ($this->query !== $query) {
            $this->queryParts = Psr7\\parse_query($query);
        }`);
                    if (placeHolders.length > 0) {
                        s.line(`        $parameterName = preg_replace([${toPatternArray(placeHolders)}], [${toArgumentArray(placeHolders)}], ${stringify(parameter.name)});`)
                    } else {
                        s.line(`        $parameterName = ${stringify(parameter.name)};`)
                    }
                    s.multiline(`        if (isset($this->queryParts[$parameterName]) && !is_array($this->queryParts[$parameterName])) {
            $this->queryParts[$parameterName] = [$this->queryParts[$parameterName]];
        }
        $this->queryParts[$parameterName][] = $${camelCase(parameter.name)};
        ksort($this->queryParts);
        $this->query = Psr7\\build_query($this->queryParts);
        return $this->withUri($this->getUri()->withQuery($this->query));
    }
                `);
                }
            }
            s.line(`}`);
        }
    }

    // Generate all children.
    function createChildren(children:KeyedNestedResources, path: string) {
        for (const key of Object.keys(children)) {
            createResource(children[key], path);
        }
    }

    function createThisResources(withParams:KeyedNestedResources, noParams:KeyedNestedResources) {
        for (const key of Object.keys(noParams)) {
            const child = noParams[key];
            const constructor = `new ${child.id}($this->getUri() . ${stringify(child.relativeUri)})`;

            if (!(withParams[key] == null)) {
                s.multiline(`
    /**`);
                for(const parameter of Object.keys(withParams[key].uriParameters)) {
                    s.line(`     * @param $${parameter}`)
                }
                s.multiline(`     * @return ${withParams[key].id}
     */
    public function with${pascalCase(child.methodName)}(${toUriParameters(withParams[key].uriParameters)})${st() ? ': ' + withParams[key].id :''} {
        ${toParamsFunction(withParams[key])}
    }`);
            }
            s.multiline(`
    /**
     * @return ${child.id}
     */
    public function ${isKeyword(child.methodName) ? '_' : ''}${camelCase(child.methodName)}()${st() ? ': ' + child.id :''} {
        return ${constructor};
    }`);
        }
    }

    return s.toString();
}
