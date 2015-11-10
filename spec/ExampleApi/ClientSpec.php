<?php

namespace spec\ExampleApi;

use GuzzleHttp\Client as HttpClient;
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

        $client = $this->getHttpClient();
        $request = $this->resources->hello->get();
        $response = $client->send($request);
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

        $client = $this->getHttpClient();
        $request = $this->resources->hello->get();
        $response = $client->send($request);
        $this->validateBaseUriResponse($response);
    }

    function it_should_append_query_string()
    {
        $request = $this->resources->bounce->url->get(['key' => 'string']);
        $response = $this->getHttpClient()->send($request);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?key=string');
    }

    function it_should_append_query_string_array()
    {
        $request = $this->resources->bounce->url->get(['test' => 'test', 'abc' => 123, 'key' => [1,2,3]], ['query' => ['xyz' => '123']]);
        $response = $this->getHttpClient()->send($request);

        $response->getStatusCode()->shouldBe(200);
        $response->getBody()->__toString()->shouldBeEqualTo('/bounce/url?abc=123&key=1&key=2&key=3&test=test&xyz=123');
    }
}

//
//describe('append query string', function () {
//    function validateResponse (response) {
//        expect(response.status).to.equal(200)
//      expect(response.body).to.equal('/bounce/url?key=string')
//    }
//
//    describe('body argument (#get)', function () {
//        it('should pass query string as an object', function () {
//            return client.resources.bounce.url.get({ key: 'string' })
//          .then(validateResponse)
//      })
//
//      it('should pass query string as a string', function () {
//          return client.resources.bounce.url.get('key=string')
//          .then(validateResponse)
//      })
//    })
