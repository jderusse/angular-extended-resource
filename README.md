# bower-angular-cached-resource

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

Then, angular cached resource add a `$cached` property to each actions. The availalbles values of `$cache` are:
- false: (or property undefined) Cache will not be used
- true: The response will be cached in local storage with a storageKey equals to the URL of the resource (** beware of your filters **)
- string: The response will be cached in local storage with this string as storageKey. As for URL, you can use the sames placeHolders
- object: For advanced cache strategy this object contains this following properties:
   - key: (boolean or string) who works as `$cache` property
   - splitKey: (boolean or string) store array resource on multiple subkeys

Example:

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
      'get':    {method:'GET', $cache: 'c_:id'},
      'query':  {method:'GET', $cache: false, isArray:true},
    });
  })

```

```javascript
  .factory('Customer', function($cResource) {
    return $cResource('/api/customers/:id', {id: '@id'}, {
      'get':    {method:'GET', $cache: 'customer_:id'},
      'query':  {method:'GET', $cache: {key: 'customers', splitKey: 'customer_:id'}, isArray:true},
    });
  })

```

The response returned by angular cache resource contains a `$cacheMetadata` property. This proerty is an object with:

- created: Date where the resource where stored in cache for the first time
- created: Date where the resource where stored in cache for the last time
- stale: When true, the properties of the resource came from cache. Otherwise false.

The `stale` sub-property let you define a custom class to informe the users, that the resource is not fuly loaded.

```html

  <style type="text/css">
  .stale {
    color: gray;
  }
  </style>
  ...
  <div ng-class="{stale: resource.$cacheMetadata.stale}">{{ resource }}</div>

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
