# bower-angular-cached-resource

## TODO

[X] Store date as integer
[X] Merge splitted resource with original cache
[ ] Split everything
    [X] Split resource on storage
    [X] Add metadata on splitted resources
    [X] Restore splitted resource
    [X] Add option to customize params on cache (id: @id) (on parent or on split)
    [X] Prefix cache keys
    [ ] Keep parents references to generate cacheKey for splitted sub resources
    [X] Handler split of isArray resources (root is an array)
[ ] Cache (in memory) calculs made on route (parse url, etc...)
[ ] Add cache key as functions

## Description

Angular cached resource is a wrapped for [Angular ngResouce](https://github.com/angular/angular.js/tree/master/src/ngResource).
It provide a simple way to fetch resource from localStorage to provide a quick "stale" response, and let the original resource fetching data from real API.
The diference with the `cache` option is: the promise is not canceled, and data are stored in localStorage instead of memory.

## Install

Install with `bower`:

```shell
bower install angular-cached-resource
```

Add a `<script>` to your `index.html`:

```html
<script src="/bower_components/angular-cached-resource/angular-cached-resource.js"></script>
```

And add `cResource` as a dependency for your app:

```javascript
angular.module('myApp', ['cResource']);
```

## Differences with angular-resource

```javascript
# angular resource
angular.module('myApp', ['ngResource']);
# angular cached resource
angular.module('myApp', ['cResource']);
```

```javascript
# angular resource
  .factory('Customer', function($resource) {
    return $resource('/api/customers/:id', {id: '@id'});
  })
# angular cached resource
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'});
  })
```

Easy isn't it?

## Documentation

First, read the documentation of [angular resource](http://docs.angularjs.org/api/ngResource).

Then, angular cached resource add a `$cached` property to each actions. When `$cache` is a boolean or a string, it's an alias for `$cache: {key: ...}` THi property contains:
- key: (boolean or string) name of the storageKey
    - When false, the cache will not be usedwho works as `$cache` property
    - When true, The response will be cached with a storageKey equals to the URL of the resource (** beware of your filters **)
    - When true, The response will be cached with this string as storageKey. As for URL, you can use the sames placeHolders
- params: (object) List of defaults params and mapping between placeHolders and property in object
- split: (object) Configuration for spliting the resource. This object contains dynamics properties.
    - The property is the path to the subresource.
    - The value is the cache configuration for the subrsource. It format is identical to $cache (it's recurcive)

Example:

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
      'get':   {method:'GET', $cache: {key:'customer/:id'}},
      'query': {method:'GET', $cache: false, isArray:true},
    });
  })
```

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
      'get':   {method:'GET', $cache: 'c_:id'},
      'query': {method:'GET', $cache: {key: true, split: {'': {key:'c_:customerId, params:{customerId:'@id'}}}, isArray:true},
    });
  })
```

The response returned by angular cache resource contains a `$cache` property. This property is an object containing:
- updated: Date where the resource fetch from the API for the last time
- stale: When true, the properties of the resource came from cache. Otherwise it has been fetch from API.

Because the `stale` sub-property is updated when the API respond and when the object is updated with fresh data, it let you define a custom class to informe the users, that the resource is not fuly loaded.

```html
  <style type="text/css">
  .stale {
    color: gray;
  }
  </style>
  ...
  <div ng-class="{stale: resource.$cache.stale}">{{ resource }}</div>
```

If the resource of your API is complexe and some parts are used by many other resources, you can split and share this resource.
This will reduce the size of each resource.

Her is sample of rsponse of `GET /api/customer/2`
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
        "code": "us",
        "name": "United States"
      }
    }
  ]
}
```

It could be interrested to store coutries in a separate localStorage to reduce size of the resource.

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
      get: {method:'GET', $cache:{
        key: 'customer/:id', # Customer will be store in localStorage under key customer/:customerId
        split: { # Lets split the customer object
          'addresses.country': { # Split each country of each addresses of the resource
            key: 'country/:id', # Store this part in cache under key country/:code
            params: {'id': '@code'} # As for placeholders in url, looks at @code property in the subObject Country
          }
        }
      }}
    });
  })

```

You can define as many split as you want et you can split nestead objects.
The following sample will store country, addresses, and customer in separates caches slots.

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
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
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
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

You're able to define a global prefix to the storageKey or change the ttl with the $cResourceConfig service

```javascript
angular.module('app', ['cResource'])
  .run(function($cResourceConfig) {
    $cResourceConfig.prefix = 'u/';
    $cResourceConfig.ttl = 24 * 3600 * 1000; // 24 hours
  })
```

Because $cResouce is a provider, you can change the default action's behaviours

```javascript
angular.module('app', ['cResource'])
  .config(function($cResourceProvider) {
    $cResourceProvider.defaults.actions.query.$cache = false;
  })
```


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
