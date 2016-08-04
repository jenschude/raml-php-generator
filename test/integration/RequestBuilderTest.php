<?php

namespace Raml\ApiGenerator\Test;
use ExampleApi\RequestBuilder;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;

/**
 * @author @jayS-de <jens.schulze@commercetools.de>
 */
class RequestBuilderTest extends \PHPUnit_Framework_TestCase
{
    private function getBuilder()
    {
        return new RequestBuilder();
    }

    protected function camelize($verb)
    {
        return lcfirst(
            implode(
                '-',
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

    function validateRequest($request, $body = 'Success')
    {
        $client = new Client();
        $response = $client->send($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($body, $response->getBody()->__toString());

        return $response;
    }

    function validateJsonResponse($request, $json, $key = null)
    {
        $client = new Client();
        $response = $client->send($request);

        $this->assertSame(200, $response->getStatusCode());
        if (is_null($key)) {
            $this->assertJsonStringEqualsJsonString($json, $response->getBody()->__toString());
        } else {
            $values = json_decode($response->getBody()->__toString(), true);
            $this->assertSame($json, $values[$key]);
        }

        return $response;
    }


    /**
     * @test
     */
    function it_should_be_able_to_manually_set_the_base_uri()
    {
        $mock = new MockHandler([
            new Response(200, ['X-Foo' => 'Bar'], 'Hello!'),
        ]);

        $handler = HandlerStack::create($mock);
        $options = [
            'handler' => $handler,
            'baseUri' => 'http://google.com/search'
        ];

        $client = new Client($options);
        $builder = new RequestBuilder(['baseUri' => 'http://google.com/search']);
        $request = $builder->hello()->get();

        $response = $client->send($request);

        $this->assertContains('http://google.com/search/hello', $request->getUri()->__toString());
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Hello!', $response->getBody()->__toString());
    }
//
//    function it_should_be_able_to_manually_set_the_base_uri_with_parameters()
//    {
//        $mock = new MockHandler([
//            new Response(200, ['X-Foo' => 'Bar'], 'Hello World!'),
//        ]);
//
//        $container = [];
//        $history = Middleware::history($container);
//        $handler = HandlerStack::create($mock);
//        $handler->push($history);
//        $options = [
//            'handler' => $handler,
//            'baseUri' => 'http://{domain}.com',
//            'baseUriParameters' => [
//                'domain' => 'test'
//            ]
//        ];
//
//        $this->beConstructedWith($options);
//
//        $request = $this->hello()->get();
//        $this->validateRequest($request, 'Hello World!');
//    }

    /**
     * @test
     */
    function it_should_append_query_string()
    {
        $request = $this->getBuilder()->bounce()->url()->get(['key' => 'string']);
        $this->validateRequest($request, '/bounce/url?key=string');
    }

    /**
     * @test
     * @group 123
     */
    function it_should_append_query_string_array()
    {
        $request = $this->getBuilder()->bounce()->url()->get([], ['query' => ['key' => [1, 2, 3]]]);

        $this->validateRequest($request, '/bounce/url?key=1&key=2&key=3');
    }

    /**
     * @test
     */
    function it_should_merge_body_and_query()
    {
        $request = $this->getBuilder()->bounce()->url()->get(
            ['test' => 'test', 'abc' => 123, 'key' => [1, 2, 3]],
            ['query' => ['xyz' => '123']]
        );

        $this->validateRequest($request, '/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    /**
     * @test
     */
    function it_should_be_a_canonical_query()
    {
        $request = $this->getBuilder()->bounce()->url()->get(
            [],
            ['query' => ['test' => 'test', 'xyz' => '123', 'abc' => 123, 'key' => [1, 2, 3]]]
        );

        $this->validateRequest($request, '/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    /**
     * @test
     */
    function it_should_pass_custom_headers_with_the_request()
    {
        $request = $this->getBuilder()->bounce()->headers()->get([], ['headers' => ['X-Custom-Header' => 'Custom Header']]);

        $this->validateJsonResponse($request, 'Custom Header', 'x-custom-header');
    }

    /**
     * @test
     */
    function it_should_use_default_headers_from_definition()
    {
        $request = $this->getBuilder()->defaults()->headers()->get();
        $this->validateJsonResponse($request, 'Hello World!', 'x-default-header');
    }

    /**
     * @test
     */
    function it_should_override_default_headers()
    {
        $request = $this->getBuilder()->defaults()->headers()->get([], ['headers' => ['x-default-header' => 'Overridden']]);
        $this->validateJsonResponse($request, 'Overridden', 'x-default-header');

    }

    /**
     * @test
     */
    function it_should_override_default_headers_with_uppercase()
    {
        $request = $this->getBuilder()->defaults()->headers()->get([], ['headers' => ['X-DEFAULT-HEADER' => 'Overridden']]);
        $this->validateJsonResponse($request, 'Overridden', 'x-default-header');
    }

    /**
     * @test
     */
    function it_should_return_response_headers()
    {
        $request = $this->getBuilder()->get();

        $response = $this->validateRequest($request);
        $this->assertSame(['Express'], $response->getHeader('X-Powered-By'));
        $this->assertSame(['text/html; charset=utf-8'], $response->getHeader('Content-Type'));
    }

    /**
     * @test
     */
    function it_should_parse_response_as_text_when_unknown()
    {
        $request = $this->getBuilder()->responses()->text()->get();
        $this->validateRequest($request, 'text');
    }

    /**
     * @test
     */
    function it_should_parse_response_as_json_when_specified()
    {
        $request = $this->getBuilder()->responses()->json()->get();
        $this->validateJsonResponse($request, '{"json": true}');
    }

    /**
     * @test
     */
    function it_should_parse_response_urlencoded_simple_query_string()
    {
        $request = $this->getBuilder()->responses()->urlEncoded()->basic()->get();
        $this->validateRequest($request, 'key=value');
    }

    /**
     * @test
     */
    function it_should_parse_response_and_put_duplicate_keys_into_array()
    {
        $request = $this->getBuilder()->responses()->urlEncoded()->duplicate()->post();
        $this->validateRequest($request, 'key=1&key=2&key=3');
    }

    /**
     * @test
     */
    function it_should_parse_response_encoded_values_uri_encoded()
    {
        $request = $this->getBuilder()->responses()->urlEncoded()->escaped()->put();
        $this->validateRequest($request, 'key=Hello%2C%20world!');
    }

    /**
     * @test
     */
    function it_should_support_root_resource()
    {
        $request = $this->getBuilder()->get();
        $this->validateRequest($request, 'Success');
    }

    /**
     * @test
     */
    function it_should_dynamically_generate_resource_chain()
    {
        $request = $this->getBuilder()->bounce()->parameter()->withVariable(123)->get();
        $this->validateRequest($request, '123');
    }

    /**
     * @test
     */
    function it_should_output_null_values_as_empty_string()
    {
        $request = $this->getBuilder()->bounce()->parameter()->withVariable(null)->get();
        $this->validateRequest($request, '');
    }

    /**
     * @test
     */
    function it_should_use_default_value_when_null()
    {
        $request = $this->getBuilder()->defaults()->parameter()->withVariable(null)->get();
        $this->validateRequest($request, 'default');
    }

    /**
     * @test
     */
    function it_should_support_single_parameter_arguments()
    {
        $request = $this->getBuilder()->parameters()->prefix()->withOne(123)->get();
        $this->validateRequest($request, '123');
    }

    /**
     * @test
     */
    function it_should_support_not_more_arguments_than_defined()
    {
        $request = $this->getBuilder()->parameters()->prefix()->withOne(123, 456)->get();
        $this->validateRequest($request, '123');
    }

    /**
     * @test
     */
    function it_should_dynamically_generate_resource_chain_with_multi_parameteters()
    {
        $request = $this->getBuilder()->parameters()->prefix()->withThree(1, 2, 3)->get();
        $this->validateRequest($request, '123');
    }

    /**
     * @test
     */
    function it_should_support_extensions_in_the_resource_chain_for_static_extensions()
    {
        $request = $this->getBuilder()->extensions()->static()->json()->get();
        $this->validateRequest($request);
    }

    /**
     * @test
     */
    function it_should_support_mediaTypeExtension_parameter()
    {
        $request = $this->getBuilder()->extensions()->mediaType()->withBasic('.json')->get();
        $this->validateRequest($request);
    }

    /**
     * @test
     */
    function it_should_have_paths_from_enum_values()
    {
        $request = $this->getBuilder()->extensions()->mediaType()->withEnum('.json')->get();
        $this->validateRequest($request);
    }

    /**
     * @test
     */
    function it_should_have_paths_from_period_prefixed_enum_values()
    {
        $request = $this->getBuilder()->extensions()->mediaType()->withEnum('.xml')->get();
        $this->validateRequest($request);
    }

    /**
     * @test
     */
    function it_should_handle_original_route()
    {
        $request = $this->getBuilder()->conflicts()->mediaType()->route()->get();
        $this->validateRequest($request);
    }

    /**
     * @test
     */
    function it_should_handle_conflict_with_media_type_extension()
    {
        $request = $this->getBuilder()->conflicts()->withMediaType('.json')->get();
        $this->validateRequest($request);
    }

    /**
     * @test
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
            $request = $this->getBuilder()->buildCustom($method, '/status/{id}', null, ['uriParameters' => ['id' => 200]]);
            $this->validateRequest($request);
        }
    }
}
