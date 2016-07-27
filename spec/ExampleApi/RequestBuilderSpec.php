<?php

namespace spec\ExampleApi;

use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class RequestBuilderSpec extends ObjectBehavior
{
    protected function camelize($verb)
    {
        return lcfirst(
            implode(
                '',
                array_map(
                    'ucfirst',
                    array_map(
                        'strtolower',
                        explode('-', $verb)
                    )
                )
            )
        );
    }

    function validateResponse($response, $body = 'Success')
    {
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual($body);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType('ExampleApi\Client');
    }

    /**
     * base uri tests
     */
    function it_should_be_able_to_manually_set_the_base_uri()
    {
        $mock = new MockHandler([
            new Response(200, ['X-Foo' => 'Bar'], 'Hello World!'),
        ]);

        $handler = HandlerStack::create($mock);
        $options = [
            'handler' => $handler,
            'baseUri' => 'http://google.com/search/'
        ];

        $this->beConstructedWith($options);

        $response = $this->hello()->get();
        $this->validateResponse($response, 'Hello World!');
    }

    function it_should_be_able_to_manually_set_the_base_uri_with_parameters()
    {
        $mock = new MockHandler([
            new Response(200, ['X-Foo' => 'Bar'], 'Hello World!'),
        ]);

        $container = [];
        $history = Middleware::history($container);
        $handler = HandlerStack::create($mock);
        $handler->push($history);
        $options = [
            'handler' => $handler,
            'baseUri' => 'http://{domain}.com',
            'baseUriParameters' => [
                'domain' => 'test'
            ]
        ];

        $this->beConstructedWith($options);

        $response = $this->hello()->get();
        $this->validateResponse($response, 'Hello World!');
    }

    /**
     * query tests
     */
    function it_should_append_query_string()
    {
        $response = $this->bounce()->url()->get(['key' => 'string']);

        $this->validateResponse($response, '/bounce/url?key=string');
    }

    function it_should_append_query_string_array()
    {
        $response = $this->bounce()->url()->get(null, ['query' => ['key' => [1, 2, 3]]]);

        $this->validateResponse($response, '/bounce/url?key=1&key=2&key=3');
    }

    function it_should_merge_body_and_query()
    {
        $response = $this->bounce()->url()->get(
            ['test' => 'test', 'abc' => 123, 'key' => [1, 2, 3]],
            ['query' => ['xyz' => '123']]
        );

        $this->validateResponse($response, '/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    function it_should_be_a_canonical_query()
    {
        $response = $this->bounce()->url()->get(
            null,
            ['query' => ['test' => 'test', 'xyz' => '123', 'abc' => 123, 'key' => [1, 2, 3]]]
        );

        $this->validateResponse($response, '/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    /**
     * request headers
     */
    function it_should_pass_custom_headers_with_the_request()
    {
        $response = $this->bounce()->headers()->get(null, ['headers' => ['X-Custom-Header' => 'Custom Header']]);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Custom Header', 'x-custom-header');
    }

    function it_should_use_default_headers_from_definition()
    {
        $response = $this->defaults()->headers()->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Hello World!', 'x-default-header');
    }

    function it_should_override_default_headers()
    {
        $response = $this->defaults()->headers()->get(null, ['headers' => ['x-default-header' => 'Overridden']]);
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Overridden', 'x-default-header');
    }

    function it_should_override_default_headers_with_uppercase()
    {
        $response = $this->defaults()->headers()->get(null, ['headers' => ['X-DEFAULT-HEADER' => 'Overridden']]);
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Overridden', 'x-default-header');
    }

    /**
     * response headers
     */
    function it_should_return_response_headers()
    {
        $response = $this->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('Success');
        $response->getHeader('X-Powered-By')->shouldEqual(['Express']);
        $response->getHeader('Content-Type')->shouldEqual(['text/html; charset=utf-8']);
    }

    /**
     * response body
     */
    function it_should_parse_response_as_text_when_unknown()
    {
        $response = $this->responses()->text()->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('text');
    }

    function it_should_parse_response_as_json_when_specified()
    {
        $response = $this->responses()->json()->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo(json_decode('{"json": true}', true));
    }

    function it_should_parse_response_urlencoded_simple_query_string()
    {
        $response = $this->responses()->urlEncoded()->basic()->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('key=value');
    }

    function it_should_parse_response_and_put_duplicate_keys_into_array()
    {
        $response = $this->responses()->urlEncoded()->duplicate()->post();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('key=1&key=2&key=3');
    }

    function it_should_parse_response_encoded_values_uri_encoded()
    {
        $response = $this->responses()->urlEncoded()->escaped()->put();
        $this->validateResponse($response, 'key=Hello%2C%20world!');
    }

    /**
     * resource chain
     */
    function it_should_support_root_resource()
    {
        $response = $this->get();
        $this->validateResponse($response, 'Success');
    }

    function it_should_dynamically_generate_resource_chain()
    {
        $response = $this->bounce()->parameter()->variable(123)->get();
        $this->validateResponse($response, '123');
    }

    function it_should_output_null_values_as_empty_string()
    {
        $response = $this->bounce()->parameter()->variable(null)->get();
        $this->validateResponse($response, '');
    }

    function it_should_use_default_value_when_null()
    {
        $response = $this->defaults()->parameter()->variable(null)->get();
        $this->validateResponse($response, 'default');
    }

    function it_should_support_single_parameter_arguments()
    {
        $response = $this->parameters()->prefix()->one(123)->get();
        $this->validateResponse($response, '123');
    }

    function it_should_support_not_more_arguments_than_defined()
    {
        $response = $this->parameters()->prefix()->one(123, 456)->get();
        $this->validateResponse($response, '123');
    }

    function it_should_dynamically_generate_resource_chain_with_multi_parameteters()
    {
        $response = $this->parameters()->prefix()->three(1, 2, 3)->get();
        $this->validateResponse($response, '123');
    }

    function it_should_support_extensions_in_the_resource_chain_for_static_extensions()
    {
        $response = $this->extensions()->static()->json()->get();
        $this->validateResponse($response);
    }

    function it_should_support_mediaTypeExtension_parameter()
    {
        $response = $this->extensions()->mediaType()->basic('json')->get();
        $this->validateResponse($response);
    }

    function it_should_have_paths_from_enum_values()
    {
        $response = $this->extensions()->mediaType()->enum()->json()->get();
        $this->validateResponse($response);
    }

    function it_should_have_paths_from_period_prefixed_enum_values()
    {
        $response = $this->extensions()->mediaType()->enumPeriod()->xml()->get();
        $this->validateResponse($response);
    }

    function it_should_handle_original_route()
    {
        $response = $this->conflicts()->mediaType()->route()->get();
        $this->validateResponse($response);
    }

    function it_should_handle_conflict_with_media_type_extension()
    {
        $response = $this->conflicts()->mediaType('json')->get();
        $this->validateResponse($response);
    }

    /**
     * Custom resource
     */
    function it_support_custom_resource_methods()
    {
        $methods = [
            'get',
            'post',
            'put',
            'head',
            'delete',
            'options',
            'trace',
            'copy',
            'lock',
            'mkcol',
            'move',
            'purge',
            'propfind',
            'proppatch',
            'unlock',
            'report',
            'mkactivity',
            'checkout',
            'merge',
            'm-search',
            'notify',
            'subscribe',
            'unsubscribe',
            'patch',
            'search',
            'connect'
        ];

        foreach ($methods as $verb) {
            if ($verb === 'connect' || $verb === 'head') {
                continue;
            }
            $method = $this->camelize($verb);
            $response = $this->resource('/status/{id}', ['id' => 200])->$method();
            $this->validateResponse($response);
        }
    }

    public function getMatchers()
    {
        return [
            'jsonBeEqualTo' => function ($subject, $json, $key = null) {
                $subject = json_decode($subject, true);
                if (!is_null($key)) {
                    $subject = $subject[$key];
                }
                return $subject == $json;
            }
        ];
    }
}
