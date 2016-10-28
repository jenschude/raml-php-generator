import {Strands} from 'strands'
import {Api} from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import stringify = require('javascript-stringify')
import { hasSecurity, getSecuritySchemes, allResources, nestedResources, NestedMethod, NestedResource } from '../support/api'
import {
    supportStrictTypes as st, toNamespace
} from '../support/feature'


export default function (api:any):string {
    const s = new Strands();
    const supportedSecuritySchemes = getSecuritySchemes(api).filter(x => x.type === 'OAuth 2.0')

    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${toNamespace(api.title)};

use Cache\\Adapter\\Filesystem\\FilesystemCachePool;
use GuzzleHttp\\Client as HttpClient;
use GuzzleHttp\\HandlerStack;
use GuzzleHttp\\Middleware;
use League\\Flysystem\\Adapter\\Local;
use League\\Flysystem\\Filesystem;
use League\\OAuth2\\Client\\Provider\\AbstractProvider;
use Psr\\Cache\\CacheItemPoolInterface;

class Client extends HttpClient {

    public function __construct(array $config = [], AbstractProvider $oauthProvider = null, CacheItemPoolInterface $cache = null)
    {
        if (!isset($config['handler'])) {
            $config['handler'] = HandlerStack::create();
        }
        if (!isset($config['credentials'])) {
            $config['credentials'] = [];
        }
        if (is_null($cache)) {
            $filesystemAdapter = new Local(__DIR__.'/../');
            $filesystem        = new Filesystem($filesystemAdapter);
            $cache = new FilesystemCachePool($filesystem);
        }`);
    supportedSecuritySchemes.forEach((scheme: any, index: number, schemes: any[]) => {
        const name = camelCase(scheme.name);
        if (scheme.type === 'OAuth 2.0') {
            s.multiline(`
        /**
         * Configure client for security scheme ${name}
         */
        $config['handler']->push(
            Middleware::mapRequest(
                $this->getHandler(
                    ${stringify(name)},
                    $config,
                    ${stringify(scheme.settings.accessTokenUri)},
                    ${stringify(scheme.settings.authorizationUri)},
                    $cache,
                    $oauthProvider
                )
            ),
            ${stringify(name)}
        );`);
        }
    });
    s.multiline(`
        parent::__construct($config);
    }
    
    private function getHandler($name, $config, $accessTokenUrl, $authorizeUrl, CacheItemPoolInterface $cache, AbstractProvider $provider = null)${st() ? ': OAuth2Handler':''} {
        $credentials = isset($config['credentials'][$name]) ? $config['credentials'][$name] : $config['credentials'];
        if (isset($config['providers'][$name])) {
            $provider = $config['providers'][$name];
        }
        if (is_null($provider)) {
            $provider = new TokenProvider(
                array_merge(
                    [
                        'urlAccessToken' => $accessTokenUrl,
                        'urlAuthorize' => $authorizeUrl,
                    ],
                    $credentials
                )
            );
        }
        return new OAuth2Handler($name, $provider, $cache);
    }
}
`);

    function getValueArray(parameters:any) {
        let params:any = [];
        const providerOptions:any = {
            urlAccessToken: '',
            urlAuthorize: '',
            urlResourceOwnerDetails: '',
            redirectUri: '',
            clientId: '',
            clientSecret: ''
        };
        const remap: any = { accessTokenUri: 'urlAccessToken', authorizationUri: 'urlAuthorize'};
        if (parameters) {
            for (const key of Object.keys(parameters)) {
                const parameter:any = parameters[key];
                if (remap[key]) {
                    providerOptions[remap[key]] = parameter
                } else {
                    providerOptions[key] = parameter
                }
            }
            for (const key of Object.keys(providerOptions)) {
                const parameter:any = providerOptions[key];
                params.push(`${stringify(key)} => ${stringify(parameter)}`);
            }
        }
        return `[` + params.join(`,\n`) + `]`;
    }

    return s.toString();
}
