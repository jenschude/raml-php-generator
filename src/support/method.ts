import camelCase = require('camel-case')
import { toMethodName, getUsedUriParameters } from './resource'
import pascalCase = require("pascal-case");
/**
 * Check if a method should export query string or body special handling.
 */
export function isQueryMethod (method: any) {
  return method.method === 'get' || method.method === 'head'
}

/**
 * Create documented request snippet.
 */
export function getRequestSnippet (method: any, resource: any) {
  const type = isQueryMethod(method) ? 'query' : 'body'

  if (method.annotations && method.annotations['client.methodName']) {
    const methodName = method.annotations['client.methodName'].structuredValue

    if (Object.keys(resource.uriParameters).length) {
      return `with${pascalCase(methodName)}([uriParameters, [${type}, [options]]])`
    }

    return `${methodName}([${type}, [options]])`
  }

  const parts = resource.relativeUri.split(/(?=[\/\.])/g)

  return parts.map(function (part: string) {
    const methodName = toMethodName(part)
    const uriParams = Object.keys(getUsedUriParameters(part, resource.uriParameters))

    if (uriParams.length) {
      return `with${pascalCase(methodName)}('${uriParams.join('\', \'')}')`
    }

    return `${methodName}()`
  }).join('->') + `->${camelCase(method.method)}($${type} = null, $options = [])`
}

/**
 * Create documented request snippet.
 */
export function getTestRequestSnippet (method: any, resource: any) {
  const type = isQueryMethod(method) ? 'query' : 'body'

  if (method.annotations && method.annotations['client.methodName']) {
    const methodName = method.annotations['client.methodName'].structuredValue

    if (Object.keys(resource.uriParameters).length) {
      return `with${pascalCase(methodName)}([uriParameters, [${type}, [options]]])`
    }

    return `${methodName}([${type}, [options]])`
  }

  const parts = resource.relativeUri.split(/(?=[\/\.])/g)

  return parts.map(function (part: string) {
        const methodName = toMethodName(part)
        const uriParams = Object.keys(getUsedUriParameters(part, resource.uriParameters))

        if (uriParams.length) {
          return `with${pascalCase(methodName)}('${uriParams.join('\', \'')}')`
        }

        return `${methodName}()`
      }).join('->') + `->${camelCase(method.method)}($${type} = null, $options = [])`
}

/**
 * Generate the display name for the README.
 */
export function getDisplayName (method: any, resource: any) {
  if (method.annotations && method.annotations['client.displayName']) {
    return method.annotations['client.displayName'].structuredValue
  }

  return `\`${getRequestSnippet(method, resource)}\``
}
