import { Strands } from 'strands'
import { Api } from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import stringify = require('javascript-stringify')

import { getDefaultParameters } from '../support/parameters'
import { hasSecurity, getSecuritySchemes, allResources, nestedResources, NestedMethod, NestedResource } from '../support/api'
import { isQueryMethod } from '../support/method'

export default function (api: Api): string {
  const s = new Strands()
  const flatTree = allResources(api) // For short-hand annotations.
  const nestedTree = nestedResources(api)
  const { withParams, noParams } = separateChildren(nestedTree)
  const supportedSecuritySchemes = getSecuritySchemes(api).filter(x => x.type === 'OAuth 2.0')

  s.multiline(`<?php
  
namespace ${pascalCase(api.title)};

use GuzzleHttp\\Psr7\\Request;

class Resource
{
    const TEMPLATE_REGEXP = '/\\{([^\\{\\}]+)\\}/';

    /**
     * @param  string $string
     * @param  mixed $interpolate
     * @param  mixed $defaults
     * @return string
     */
    protected function template($string, $interpolate = [], $defaults = []) {
        $defaults = !is_null($defaults) ? $defaults : [];
        $interpolate = !is_null($interpolate) ? $interpolate : [];

        return preg_replace_callback(static::TEMPLATE_REGEXP, function ($matches) use ($defaults, $interpolate) {
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

    public function __construct($uri)
    {
        $this->setUri($uri);
    }

    protected function setUri($uri)
    {
        $this->uri = $uri;
    }

    protected function getUri()
    {
        return $this->uri;
    }

    protected function build($method, $uri, $body = null)
    {
        return new Request($method, $uri, [], $body);
    }
}

class RequestBuilder extends Resource
{
    public function __construct()
    {
        parent::__construct('.');
    }
`)

  createRootResource(nestedTree)
  s.multiline(`
}`)


  // for (const resource of flatTree) {
  //   const { relativeUri, uriParameters } = resource
  //
  //   for (const method of resource.methods) {
  //     if (method.annotations && method.annotations['client.methodName']) {
  //       const methodName = method.annotations['client.methodName'].structuredValue
  //       const type = isQueryMethod(method) ? 'query' : 'body'
  //       const headers = getDefaultParameters(method.headers)
  //       console.log(methodName)
  //       if (Object.keys(uriParameters).length) {
  //
  //         s.multiline(`
  //   public function ${methodName} ($uriParams) {
  //       return new Request(${stringify(method.method)}, $this->getUri(), []);
  //   }`)
  //         s.line(`  var uriParameters = extend(${stringify(getDefaultParameters(uriParameters))}, uriParams)`)
  //         s.line(`  var options = extend({ ${type}: ${type}, uriParameters: uriParameters, headers: ${stringify(headers)} }, opts)`)
  //         s.line(`  return request(this, ${stringify(method.method)}, ${stringify(relativeUri)}, options)`)
  //         s.line(`}`)
  //       } else {
  //         s.line(`Client.prototype.${methodName} = function (${type}, opts) {`)
  //         s.line(`  var options = extend({ ${type}: ${type}, headers: ${stringify(headers)} }, opts)`)
  //         s.line(`  return request(this, ${stringify(method.method)}, ${stringify(relativeUri)}, options)`)
  //         s.line(`}`)
  //       }
  //     }
  //   }
  // }

  createChildren(nestedTree.children)

  // Interface for mapped nested resources.
  interface KeyedNestedResources {
    [key: string]: NestedResource
  }

  // Create prototype methods.
  function createProtoMethods (methods: NestedMethod[], id: string) {
    for (const method of methods) {
      const headers = getDefaultParameters(method.headers)
      const type = isQueryMethod(method) ? 'query' : 'body'

      s.line(`    public function ${camelCase(method.method)} ($options = null) {`)
      s.line(`        return $this->build(${stringify(method.method)}, $this->getUri());`)
      s.line(`    }`)
    }
  }

  // Split children by "type" of method that needs to be created.
  function separateChildren (resource: NestedResource) {
    const withParams: KeyedNestedResources = {}
    const noParams: KeyedNestedResources = {}

    // Split apart children types.
    for (const key of Object.keys(resource.children)) {
      const child = resource.children[key]

      if (Object.keys(child.uriParameters).length) {
        withParams[child.methodName] = child
      } else {
        noParams[child.methodName] = child
      }
    }

    return { withParams, noParams }
  }

  function toParamsFunction (child: NestedResource) {
    return `
        ${setDefaultValues(child.uriParameters)}
        $uri = $this->template($this->getUri() . ${stringify(child.relativeUri)}, ${toArray(child.uriParameters)});
        return new ${child.id}($uri);
    `
  }

  function setDefaultValues(parameters: any)
  {
    const params: any = []
    for (const key of Object.keys(parameters)) {
      const parameter: any = parameters[key]
      if (parameter.default) {
        params.push(`if (is_null($${key})) { $${key} = ${stringify(parameter.default)}; }`)
      }
    }
    return params.join(`\n`)
  }
  function toArray(parameters: any)
  {
    const params: any = []
    for (const key of Object.keys(parameters)) {
      params.push(`'${key}' => $${key}`);
    }
    return `[` + params.join(`, `) + `]`
  }

  function toUriParameters(parameters: any) {
    const params: any = []
    for (const key of Object.keys(parameters)) {
      const parameter: any = parameters[key]
      if (parameter.default) {
        params.push(`$${key} = ${stringify(parameter.default)}`);
      } else {
        params.push(`$${key}`);
      }
    }
    return params.join(`, `)
  }

  // Create prototype resources.
  function createProtoResources (withParams: KeyedNestedResources, noParams: KeyedNestedResources, id: string) {
    for (const key of Object.keys(withParams)) {
      const child = withParams[key]

      // Skip inlined entries.
      if (noParams[key] != null) {
        continue
      }
      s.line(`
    public function ${child.methodName} (${toUriParameters(child.uriParameters)}) {
      ${toParamsFunction(child)}
    }
      `)
    }
  }

  // Create nested resource instances.
  function createRootResource (resource: NestedResource) {
    const { withParams, noParams } = separateChildren(resource)

    createThisResources(withParams, noParams)

    createProtoMethods(resource.methods, resource.id)
    createProtoResources(withParams, noParams, resource.id)
  }

  // Create nested resource instances.
  function createResource (resource: NestedResource) {
    const { withParams, noParams } = separateChildren(resource)

    s.line(`class ${resource.id} extends Resource {`)

    createThisResources(withParams, noParams)

    createProtoMethods(resource.methods, resource.id)
    createProtoResources(withParams, noParams, resource.id)

    s.line(`}`)

    createChildren(resource.children)
  }

  // Generate all children.
  function createChildren (children: KeyedNestedResources) {
    for (const key of Object.keys(children)) {
      createResource(children[key])
    }
  }

  function createThisResources (withParams: KeyedNestedResources, noParams: KeyedNestedResources) {
    for (const key of Object.keys(noParams)) {
      const child = noParams[key]
      const constructor = `new ${child.id}($this->getUri() . ${stringify(child.relativeUri)})`

      if (withParams[key] == null) {
        s.multiline(`
    public function ${child.methodName}() {
        return ${constructor};
    }`
        )
      } else {
        // s.line(`  this.${child.methodName} = setprototypeof(${toParamsFunction(withParams[key])}, ${constructor})`)
        s.multiline(`
    public function ${child.methodName} (${toUriParameters(withParams[key].uriParameters)}) {
        ${toParamsFunction(withParams[key])}
    }
        `);
      }
    }
  }

  return s.toString()
}
