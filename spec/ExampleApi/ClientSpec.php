<?php

namespace spec\ExampleApi;

use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ClientSpec extends ObjectBehavior
{
    function validateBaseUriResponse ($response) {
        $response->getBody()->__toString()->shouldBeEqualTo('Hello World!');
        $response->getStatusCode()->shouldBe(200);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType('ExampleApi\Client');
    }

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

        $response = $this->resources->hello->get();
        $this->validateBaseUriResponse($response);
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

        $response = $this->resources->hello->get();
        $this->validateBaseUriResponse($response);
    }

    function it_should_append_query_string()
    {
        $response = $this->resources->bounce->url->get(['key' => 'string']);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?key=string');
    }

    function it_should_append_query_string_array()
    {
        $response = $this->resources->bounce->url->get(null, ['query' => ['key' => [1,2,3]]]);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?key=1&key=2&key=3');
    }

    function it_should_merge_body_and_query()
    {
        $response = $this->resources->bounce->url->get(
            ['test' => 'test', 'abc' => 123, 'key' => [1,2,3]],
            ['query' => ['xyz' => '123']]
        );

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    function it_should_be_a_canonical_query()
    {
        $response = $this->resources->bounce->url->get(
            null,
            ['query' => ['test' => 'test', 'xyz' => '123', 'abc' => 123, 'key' => [1,2,3]]]
        );

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }

    function it_should_pass_custom_headers_with_the_request()
    {
        $response = $this->resources->bounce->headers->get(null, ['headers' => ['X-Custom-Header' =>  'Custom Header']]);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Custom Header', 'x-custom-header');
    }

    function it_should_use_default_headers_from_definition()
    {
        $response = $this->resources->defaults->headers->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Hello World!', 'x-default-header');
    }

    function it_should_override_default_headers()
    {
        $response = $this->resources->defaults->headers->get(null, ['headers' => ['x-default-header' => 'Overridden']]);
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo('Overridden', 'x-default-header');
    }

    function it_should_return_response_headers()
    {
        $response = $this->resources->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('Success');
        $response->getHeader('X-Powered-By')->shouldEqual(['Express']);
        $response->getHeader('Content-Type')->shouldEqual(['text/html; charset=utf-8']);
    }

    function it_should_parse_response_as_text_when_unknown()
    {
        $response = $this->resources->responses->text->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('text');
    }

    function it_should_parse_response_as_json_when_specified()
    {
        $response = $this->resources->responses->json->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldJsonBeEqualTo(json_decode('{"json": true}', true));
    }

    function it_should_parse_response_urlencoded_simple_query_string()
    {
        $response = $this->resources->responses->urlEncoded->basic->get();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('key=value');
    }

    function it_should_parse_response_and_put_duplicate_keys_into_array()
    {
        $response = $this->resources->responses->urlEncoded->duplicate->post();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('key=1&key=2&key=3');
    }

    function it_should_parse_response_encoded_values_uri_encoded()
    {
        $response = $this->resources->responses->urlEncoded->escaped->put();
        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldEqual('key=Hello%2C%20world!');
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
