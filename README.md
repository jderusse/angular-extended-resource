# angular-extended-resource

## Description

Angular extended resource is a wrapper for
[Angular ngResouce](https://github.com/angular/angular.js/tree/master/src/ngResource).
It provide a simple way to fetch resource from localStorage to provide a quick
"stale" response, and let the original resource fetching data from real API.
And to extract responses from a sub object: Some browsers can not handle a JSON
response with an array on toplevel. Rest service commonly wrap the resonse
inside an object

```json
// bad
[
    {
        id: 1,
        name: "foo"
    },
    {
        id: 2,
        name: "bar"
    }
]

// good
{
    "customers": [
        {
            id: 1,
            name: "foo"
        },
        {
            id: 2,
            name: "bar"
        }
    ]
}
```


The diference with the `cache` option are:
- the promise is not canceled
- and data are stored in localStorage instead of memory.

## Install

Install with `bower`:

```shell
bower install angular-extended-resource
```

Add a `<script>` to your `index.html`:

```html
<script src="/bower_components/angular-extended-resource/angular-extended-resource.js"></script>
```

And add `exResource` as a dependency for your app:

```javascript
angular.module('myApp', ['exResource']);
```

## Differences with angular-resource

```javascript
// angular resource
angular.module('myApp', ['ngResource']);

// angular extended resource
angular.module('myApp', ['exResource']);
```

```javascript
// angular resource
app.factory('Customer', function($resource) {
  return $resource('/api/customers/:id', {id: '@id'});
})

// angular extended resource
app.factory('Customer', function($xResouce) {
  return $xResouce('/api/customers/:id', {id: '@id'});
})
```

** Easy isn't it? **

## AccessProperty Documentation

First, read the documentation of [angular resource](http://docs.angularjs.org/api/ngResource).

Then, angular extended resource add a `$accessProperty` property to each actions.
When defined, the response will be parsed an object with a toplevel property
equals to the value of `$accessProperty` will be expected. The content of this
property will be return as resource. If not, a error will be logged in the
console

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      'get':    {method:'GET', $accessProperty: 'customer'},
      'query':  {method:'GET', $accessProperty: 'customers', isArray:true},
      'save':   {method:'POST', $accessProperty: 'customer'},
      'delete': {method:'DELETE'},
    });
  })
```

This config will expect the following responses

```json
GET /customers
{
    "customers": [
        {
            id: 1,
            name: "foo"
        },
        {
            id: 2,
            name: "bar"
        }
    ]
}

GET /customers/1
{
    "customer": {
        id: 1,
        name: "foo"
    }
}
```

and ngRessource will process the response as it was:

```json
GET /customers
[
    {
        id: 1,
        name: "foo"
    },
    {
        id: 2,
        name: "bar"
    }
]

GET /customers/1
{
    id: 1,
    name: "foo"
}
```

## Cache Documentation

First, read the documentation of [angular resource](http://docs.angularjs.org/api/ngResource).

Then, angular extended resource add a `$cached` property to each actions.
When `$cache` is a boolean or a string, it's an alias for `$cache: {key: ...}`
This property is an object containing contains:
- key: (boolean, string or function) name of the storageKey
    - When false, the cache will not be used
    - When true, The response will be cached with a storageKey equals to the URL of the resource (** beware of your filters **)
    - When string, The response will be cached with this string as storageKey. As for URL, you can use the sames placeHolders
    - When function, The response will be cached under a key evaluated by a call to the function.
- params: (object) List of defaults params and mapping between placeHolders and property in object
- split: (object) Configuration for spliting the resource. This object contains dynamics properties.
    - The property is the path to the subresource.
    - The value is the cache configuration for the subrsource. It format is identical to $cache (it's recurcive)

Example:

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      'get':   {method:'GET', $cache: true},
      'query': {method:'GET', $cache: false, isArray:true},
    });
  })
```

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      'get':   {method:'GET', $cache: {key: function(parameters) {return 'customer/' + parameters.id}}},
      'query': {method:'GET', $cache: {key: true, split: {'': {key:'customer/:customerId', params:{customerId:'@id'}}}, isArray:true},
    });
  })
```

The response returned by angular cache resource contains a `$cache` property.
This property is an object containing:
- updated: Date where the resource fetch from the API for the last time
- stale: When true, the properties of the resource came from cache. Otherwise it has been fetch from API.

Because the `stale` sub-property is updated when the API respond and when
the object is updated with fresh data, it let you define a custom class to
inform the users, that the resource is not fully loaded.

```html
  <style type="text/css">
  .stale-resource {
    color: gray;
  }
  </style>
  ...
  <div ng-class="{'stale-resource': resource.$cache.stale}">{{ resource }}</div>
```

If the resource of your API is complex and some parts are used by many other
resources, you can split and share this resource. This will reduce the size of
each resource.

Her is sample of response of `GET /api/customer/2`
```json
{
  "id": 2,
  "name": "John Doe",
  "addresses": [
    {
      "id": 1,
      "street": "foo",
      "country": {
        "code": "fr",
        "name": "france"
      }
    },
    {
      "id": 2,
      "street": "bar",
      "country": {
        "code": "fr",
        "name": "france"
      }
    }
  ]
}
```

It could be interested to store countries in a separate localStorage to reduce
size of the resource.

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id',        // Customer will be store in localStorage under key customer/:customerId
        split: {                    // Lets split the customer object
          'addresses.country': {    // Split each country of each addresses of the resource
            key: 'country/:id',     // Store this part in cache under key country/:id
            params: {'id': '@code'} // As for placeholders in url, `id` refere to the @code property in the subObject Country
          }
        }
      }}
    });
  })

```

You can define as many split as you want et you can split nestead objects.
The following sample will store country, addresses, and customer in separates
caches slots.

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id',
        split: {
          'addresses': {
            key: 'address/:id',
            params: {'id': '@id'}
          },
          'addresses.country': {
            key: 'country/:code',
            params: {'code': '@code'}
          },
        }
      }},
    });
  })
```
this example is equals to

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id',
        split: {
          'addresses': {
            key: 'address/:id',
            params: {'id': '@id'},
            split: {
              'country': {
                key: 'country/:code',
                params: {'code': '@code'}
              },
            }
          }
        }
      }},
    });
  })
```
Each stored resource will be automatically removed when there life time will
extends the configured TTL.
You're able to define a global prefix to the storageKey or change the ttl
with the $xResouceConfig service

```javascript
angular.module('app', ['cResource'])
  .run(function($xResouceConfig, myAuthService) {
    $xResouceConfig.prefix = 'u/' + myAuthService.user.id + '/';
    $xResouceConfig.ttl = 24 * 3600 * 1000; // 24 hours
  })
```

Because $xResouce is a provider, you can change the default action's behaviors

```javascript
angular.module('app', ['cResource'])
  .config(function($xResouceProvider) {
    $xResouceProvider.defaults.actions.query.$cache = false;
  })
```

In split resources, you can use identifiers of parents to compose the key.

```javascript
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:customerId',
        params: {customerId: '@id'}
        split: {
          'addresses': {
            key: 'customer/:customerId/address/:addressId',
            params: {'addressId': '@id'},
          }
        }
      }},
    });
  })
```

If your resources and sub resources use the same property name as identifier
(like `id` or `uuid`) don't forget to specify a different mapping name or
specify a new params mapping. Otherwise, all your resources will be merged under
the same storageKey

```javascript
  // bad
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id',
        split: {
          'addresses': {
            key: 'address/:id', // :id is a reference Customer's `{id: '@id'}` defined near URL definition
          }
        }
      }},
    });
  })

  // good
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id',
        split: {
          'addresses': {
            key: 'address/:id',  // :id is a reference Address's `{id: '@id'}` defined next line
            params: {id; '@id'}
          }
        }
      }},
    });

  // good
  .factory('Customer', function($xResouce) {
    return $xResouce('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:customerId',
        params: {customerId; '@id'}
        split: {
          'addresses': {
            key: 'address/:addressId',
            params: {addressId; '@id'}
          }
        }
      }},
    });
  })
```


## Author
Jérémy Derussé, https://github.com/jeremy-derusse/angular-extended-resource

## Date
2014-08-10

## Module Version
1.0.0

## Contributors

## Change Log
* v1.0.0
    - Initial version.


## License

The MIT License

Copyright (c) 2010-2012 Google, Inc. http://angularjs.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
