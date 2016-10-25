import {Strands} from 'strands'
import {Api} from 'raml-generator'
import pascalCase = require('pascal-case')
import camelCase = require('camel-case')
import stringify = require('javascript-stringify')
import { hasSecurity, getSecuritySchemes, allResources, nestedResources, NestedMethod, NestedResource } from '../support/api'
import {
    supportStrictTypes as st
} from '../support/feature'


export default function (api:any):string {
    const s = new Strands();
    const supportedSecuritySchemes = getSecuritySchemes(api).filter(x => x.type === 'OAuth 2.0')


    s.line(`<?php`);
    if (st()) {
        s.line(`declare(strict_types=1);`);
    }
    s.multiline(`
namespace ${pascalCase(api.title)};

use InvalidArgumentException;
use League\\OAuth2\\Client\\Provider\\AbstractProvider;
use League\\OAuth2\\Client\\Provider\\Exception\\IdentityProviderException;
use League\\OAuth2\\Client\\Provider\\GenericResourceOwner;
use League\\OAuth2\\Client\\Token\\AccessToken;
use League\\OAuth2\\Client\\Tool\\BearerAuthorizationTrait;
use Psr\\Http\\Message\\ResponseInterface;

/**
 * Represents a generic service provider that may be used to interact with any
 * OAuth 2.0 service provider, using Bearer token authentication.
 */
class TokenProvider extends AbstractProvider
{
    use BearerAuthorizationTrait;

    /**
     * @var string
     */
    private $urlAuthorize;

    /**
     * @var string
     */
    private $urlAccessToken;

    /**
     * @var string
     */
    private $urlResourceOwnerDetails;

    /**
     * @var string
     */
    private $accessTokenMethod;

    /**
     * @var string
     */
    private $accessTokenResourceOwnerId;

    /**
     * @var array|null
     */
    private $scopes = null;

    /**
     * @var string
     */
    private $scopeSeparator;

    /**
     * @var string
     */
    private $responseError = 'error';

    /**
     * @var string
     */
    private $responseCode;

    /**
     * @var string
     */
    private $responseResourceOwnerId = 'id';

    /**
     * @var string
     */
    private $scope;

    /**
     * @param array $options
     * @param array $collaborators
     */
    public function __construct(array $options = [], array $collaborators = [])
    {
        $this->assertRequiredOptions($options);

        $possible   = $this->getConfigurableOptions();
        $configured = array_intersect_key($options, array_flip($possible));

        foreach ($configured as $key => $value) {
            $this->$key = $value;
        }

        // Remove all options that are only used locally
        $options = array_diff_key($options, $configured);

        parent::__construct($options, $collaborators);
    }

    /**
     * Returns all options that can be configured.
     *
     * @return array
     */
    protected function getConfigurableOptions()${st() ? ': array':''}
    {
        return array_merge($this->getRequiredOptions(), [
            'accessTokenMethod',
            'accessTokenResourceOwnerId',
            'scopeSeparator',
            'responseError',
            'responseCode',
            'responseResourceOwnerId',
            'scopes',
            'scope',
        ]);
    }

    /**
     * Returns all options that are required.
     *
     * @return array
     */
    protected function getRequiredOptions()${st() ? ': array':''}
    {
        return [
            'urlAccessToken',
            'urlAuthorize'
        ];
    }

    /**
     * Verifies that all required options have been passed.
     *
     * @param  array $options
     * @return void
     * @throws InvalidArgumentException
     */
    private function assertRequiredOptions(array $options)
    {
        $missing = array_diff_key(array_flip($this->getRequiredOptions()), $options);

        if (!empty($missing)) {
            throw new InvalidArgumentException(
                'Required options not defined: ' . implode(', ', array_keys($missing))
            );
        }
    }

    /**
     * @inheritdoc
     */
    public function getBaseAuthorizationUrl()${st() ? ': string':''}
    {
        return $this->urlAuthorize;
    }

    /**
     * @inheritdoc
     */
    public function getBaseAccessTokenUrl(array $params)${st() ? ': string':''}
    {
        return $this->urlAccessToken;
    }

    /**
     * @inheritdoc
     */
    public function getResourceOwnerDetailsUrl(AccessToken $token)${st() ? ': string':''}
    {
        return $this->urlResourceOwnerDetails;
    }

    /**
     * @inheritdoc
     */
    public function getDefaultScopes()
    {
        return $this->scopes;
    }

    /**
     * @inheritdoc
     */
    protected function getAccessTokenMethod()${st() ? ': string':''}
    {
        return $this->accessTokenMethod ?: parent::getAccessTokenMethod();
    }

    /**
     * @inheritdoc
     */
    protected function getAccessTokenResourceOwnerId()
    {
        return $this->accessTokenResourceOwnerId ?: parent::getAccessTokenResourceOwnerId();
    }

    /**
     * @inheritdoc
     */
    protected function getScopeSeparator()${st() ? ': string':''}
    {
        return $this->scopeSeparator ?: parent::getScopeSeparator();
    }

    /**
     * @inheritdoc
     */
    protected function checkResponse(ResponseInterface $response, $data)
    {
        if (!empty($data[$this->responseError])) {
            $error = $data[$this->responseError];
            $code  = $this->responseCode ? $data[$this->responseCode] : 0;
            throw new IdentityProviderException($error, $code, $data);
        }
    }

    /**
     * @inheritdoc
     */
    protected function createResourceOwner(array $response, AccessToken $token)${st() ? ': GenericResourceOwner':''}
    {
        return new GenericResourceOwner($response, $this->responseResourceOwnerId);
    }

    /**
     * Builds request options used for requesting an access token.
     *
     * @param  array $params
     * @return array
     */
    protected function getAccessTokenOptions(array $params)${st() ? ': array':''}
    {
        $options = [
            'headers' => [
                'content-type' => 'application/x-www-form-urlencoded',
                'authorization' => 'Basic ' . base64_encode($params['client_id'] . ':' . $params['client_secret'])
            ]
        ];
        if ($this->getAccessTokenMethod() === self::METHOD_POST) {
            $options['body'] = $this->getAccessTokenBody($params);
        }

        return $options;
    }
    
    public function getAccessToken($grant, array $options = [])${st() ? ': AccessToken':''}
    {
        if (!is_null($this->scope) && !isset($options['scope'])) {
            $options['scope'] = $this->scope;
        }
        return parent::getAccessToken($grant, $options);
    }
}
`);

    return s.toString();
}
