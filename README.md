# angular-extended-resource

## Description

Angular extended resource is a wrapper for
[Angular ngResouce](https://github.com/angular/angular.js/tree/master/src/ngResource).
It provide a simple way to fetch resource from localStorage to provide a quick
"stale" response, and let the original resource fetching data from real API.
And to extract responses from a sub object:

The diference with the `cache` option are:
- the promise is not canceled
- and data are stored in localStorage instead of memory.

[Demo](http://jeremy-derusse.github.io/angular-extended-resource/demo) available on [github.io pages](jeremy-derusse.github.io/angular-extended-resource)

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

Easy isn't it?

## Basic AccessPropery Usage

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

Advanced documentation on [dedicated project page](http://jeremy-derusse.github.io/angular-extended-resource)

## Basic Cache Usage

```javascript
.factory('Customer', function($xResouce) {
  return $xResouce('/api/customers/:id', {id: '@id'}, {
    'get':   {method:'GET', $cache: true},
    'query': {method:'GET', $cache: false, isArray:true},
  });
})
```

Advanced documentation on [dedicated project page](http://jeremy-derusse.github.io/angular-extended-resource)

## Author
Jérémy Derussé, https://github.com/jeremy-derusse

## Last Version
v1.0.0

## Contributors

## Change Log
* v1.0.0
    - Initial version.


## License

The MIT License (MIT)

Copyright (c) 2014 Jérémy Derussé

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
