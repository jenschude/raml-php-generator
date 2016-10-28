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
use League\\OAuth2\\Client\\Provider\\AbstractProvider;
use League\\Flysystem\\Adapter\\Local;
use League\\Flysystem\\Filesystem;
use League\\OAuth2\\Client\\Token\\AccessToken;
use Psr\\Cache\\CacheItemInterface;
use Psr\\Cache\\CacheItemPoolInterface;
use Psr\\Http\\Message\\RequestInterface;

class OAuth2Handler {
    
    private $name;
    private $provider;
    private $cache;

    public function __construct($name, AbstractProvider $provider, CacheItemPoolInterface $cache = null) {
        $this->provider = $provider;
        $this->name = $name;        

        if (is_null($cache)) {
            $filesystemAdapter = new Local(__DIR__.'/');
            $filesystem        = new Filesystem($filesystemAdapter);
            $cache = new FilesystemCachePool($filesystem);
        }
        $this->cache = $cache;
    }
    
    public function __invoke(RequestInterface $request, array $options = [])${st() ? ': RequestInterface':''} {
        if ($request->hasHeader('Authorization') || isset($options['securedBy']) && $this->name !== $options['securedBy']) {
            return $request;
        }
        return $request->withHeader('Authorization', 'Bearer ' . $this->getBearerToken());
    }
    
    private function getBearerToken()${st() ? ': string':''}
    {
        $item = null;
        if (!is_null($this->cache)) {
            $item = $this->cache->getItem(sha1('access_token_' . $this->name));
            if ($item->isHit()) {
                return $item->get();
            }
        }
        
        $token = $this->provider->getAccessToken('client_credentials');
        // ensure token to be invalidated in cache before TTL
        $ttl = max(1, floor(($token->getExpires() - time())/2));
        $this->saveToken($token, $item, $ttl);
        
        
        return $token->getToken();
    }
    
    private function saveToken(AccessToken $token, CacheItemInterface $item, $ttl)
    {
        if (!is_null($this->cache)) {
            $item->set($token->getToken())->expiresAfter((int)$ttl);
            $this->cache->save($item);
        }
    }
}
`);

    return s.toString();
}
