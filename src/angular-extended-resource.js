/*
 Angular Extended Resource v1.0.0
 License: MIT
*/
'use strict';

angular.module('exResource', ['ngResource'])
  .run(['$interval', '$xResourceCacheEngine', function($interval, $xResourceCacheEngine) {
    $interval(function() {$xResourceCacheEngine.gc();}, 300000);
    $xResourceCacheEngine.gc();
  }])
  .factory('$xResourceConfig', function() {
    return {
      ttl: 864000,
      prefix: ''
    };
  })
  .factory('$xResourceCacheEngine', ['$window', '$xResourceConfig', function($window, $xResourceConfig) {
    return {
      put: function put(key, value) {
        if (angular.isArray(value)) {
          value = angular.copy(value);
        } else {
          value = angular.extend({}, this.get(key), value);
        }
        delete value.$promise;
        delete value.$resolved;
        delete value.$cache;
        var o = [
              new Date().getTime(),
              value
            ],
            encoded = JSON.stringify(o);

        if (angular.isUndefined(encoded)) {
          delete $window.localStorage[key];
        } else {
          $window.localStorage[key] = encoded;
        }
      },
      get: function get(key) {
        var data = $window.localStorage[key];
        if (angular.isUndefined(data) || data === 'undefined') {
          return undefined;
        }
        var s = JSON.parse(data);
        var value = s[1];
        value.$cache = {updated: s[0], stale: true};
        return value;
      },
      gc: function gc() {
        var now = new Date().getTime();
        angular.forEach($window.localStorage, function(data, index) {
          if (angular.isDefined(data) && data !== 'undefined') {
            var s = JSON.parse(data);
            if (angular.isArray(s) && s.length > 1) {
              if (s[0] + $xResourceConfig.ttl < now) {
                delete $window.localStorage[index];
              }
            }
          }
        });
      }
    };
  }])
  .provider('$xResource', function() {
    var provider = this;

    this.defaults = {
      actions: {
        'get':    {method:'GET', $cache:true},
        'query':  {method:'GET', $cache:{key:true, split: {'': true}}, isArray:true},
      }
    };

    this.$get = ['$window', '$http', '$log', '$resource', '$xResourceConfig', '$xResourceCacheEngine', function($window, $http, $log, $resource, $xResourceConfig, $xResourceCacheEngine) {
      /**
       * Manipulate template and placeHolder
       *
       * @see ngResource Route
       */
      function TemplateEngine() {
        this._parsed = {};
      }

      /**
       * @see ngResource Route
       *
       * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
       * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
       * segments:
       *    segment       = *pchar
       *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
       *    pct-encoded   = "%" HEXDIG HEXDIG
       *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
       *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
       *                     / "*" / "+" / "," / ";" / "="
       */
      TemplateEngine.prototype.encodeUriSegment = function encodeUriSegment(val) {
        return this.encodeUriQuery(val, true).
          replace(/%26/gi, '&').
          replace(/%3D/gi, '=').
          replace(/%2B/gi, '+');
      };

      /**
       * @see ngResource Route
       *
       * This method is intended for encoding *key* or *value* parts of query component. We need a
       * custom method because encodeURIComponent is too aggressive and encodes stuff that doesn't
       * have to be encoded per http://tools.ietf.org/html/rfc3986:
       *    query       = *( pchar / "/" / "?" )
       *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
       *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
       *    pct-encoded   = "%" HEXDIG HEXDIG
       *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
       *                     / "*" / "+" / "," / ";" / "="
       */
      TemplateEngine.prototype.encodeUriQuery = function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).
          replace(/%40/gi, '@').
          replace(/%3A/gi, ':').
          replace(/%24/g, '$').
          replace(/%2C/gi, ',').
          replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
      };


      /**
       * Parse an template by extracting urlParams
       *
       * @param string template
       *
       * @return object
       */
      TemplateEngine.prototype.extractParams = function extractParams(template) {
        if (!this._parsed[template]) {
          var url = template,
              urlParams = {};

          angular.forEach(url.split(/\W/), function(param){
            if (param === 'hasOwnProperty') {
              throw angular.$$minErr('$xResource')('badname', 'hasOwnProperty is not a valid parameter name.');
            }

            var paramRegExp = new RegExp('(^|[^\\\\]):' + param + '(\\W|$)', 'g');
            if (param && !(/^\\d+$/.test(param)) && (paramRegExp.test(url))) {
              urlParams[param] = paramRegExp;
            }
          });

          this._parsed[template] = urlParams;
        }

        return this._parsed[template];
      };

      /**
       * Replace placeHolder from a template
       *
       * @param string template Template to render
       * @param object params   List of params
       *
       * @return string
       */
      TemplateEngine.prototype.render = function render(template, params) {
        var _this = this;
        var url = template;
        var urlParams = this.extractParams(template);

        params = params || {};
        angular.forEach(urlParams, function(regExp, urlParam){
          var val = params.hasOwnProperty(urlParam) ? params[urlParam] : undefined,
              encodedVal;

          if (angular.isDefined(val) && val !== null) {
            encodedVal = _this.encodeUriSegment(val);
            url = url.replace(regExp, function(_, head, tail) {
              return head + encodedVal + tail;
            });
          } else {
            url = url.replace(regExp, '');
          }
        });

        // replace escaped `\:` with `:`
        url = url.replace(/\\:/g, ':');
        // strip trailing slashes and set the url
        url = url.replace(/\/+$/, '') || '/';
        // then replace collapse `/.` if found in the last URL path segment before the query
        // E.g. `http://url.com/id/.format?q=x` becomes `http://url.com/id.format?q=x`
        url = url.replace(/\/\.(?=\w+($|\?))/, '.');
        // replace escaped `/\.` with `/.`
        return url.replace(/\/\./, '/.');
      };

      /**
       * Provides tool for exploring an object
       */
      function PathExplorer() {
      }

      PathExplorer.MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

      /**
       * Determine if the path is valid or not
       *
       * @param string path
       *
       * @return Boolean
       */
      PathExplorer.prototype.isValidDottedPath = function isValidDottedPath(path) {
        return (path !== null && path !== '' && path !== 'hasOwnProperty' &&
            PathExplorer.MEMBER_NAME_REGEX.test('.' + path));
      };

      /**
       * Retreives an elements by the property path
       *
       * @param object obj Object to lookup
       * @param string path
       *
       * @return mixed
       */
      PathExplorer.prototype.getElement = function getElement(obj, path) {
        if (!this.isValidDottedPath(path)) {
          throw angular.$$minErr('badmember', 'Dotted member path "@{0}" is invalid.', path);
        }
        var keys = path.split('.');
        for (var i = 0, ii = keys.length; i < ii && angular.isDefined(obj); i++) {
          var key = keys[i];
          obj = (obj !== null) ? obj[key] : undefined;
        }
        return obj;
      };

      /**
       * Apply a callback to an element of an object
       *
       * @param mixed    object   Object to modify
       * @param string   path     Path to the attributte to modify
       * @param Function callback Function to apply to the object
       *
       * @return Edited object
       */
      PathExplorer.prototype.changeElement = function changeElement(object, path, callback) {
        var _this = this;
        if (path === '') {
          if (angular.isArray(object)) {
            var objectCopy = angular.copy(object);
            object.length = 0;
            angular.forEach(objectCopy, function(element) {
              var sub = callback(element);
              if (angular.isDefined(sub)) {
                object.push(callback(element));
              }
            });

            return object;
          } else {
            return callback(object);
          }
        } else {
          if (!this.isValidDottedPath(path)) {
            throw angular.$$minErr('$xResource')('badmember', 'Dotted member path "@{0}" is invalid.', path);
          }
          var keys = path.split('.');
          var key = keys.shift();
          var subPath = keys.join('.');

          angular.forEach(angular.isArray(object) ? object: [object], function(element) {
            if (angular.isDefined(element[key])) {
              element[key] = _this.changeElement(element[key], subPath, callback);
            }
          });

          return object;
        }
      };

      /**
       * Resource cachen engine
       *
       * @param string template      Default cacheKey template
       * @param object paramDefaults Default cacheKey placeholders
       * @param object cacheSettings Cache settings
       */
      function Engine(template, paramDefaults, cacheSettings) {
        this.enabled = true;
        this.template = template;
        this.paramDefaults = paramDefaults || {};
        this.init(cacheSettings);
      }

      /**
       * Initialize the engine
       *
       * @param object cacheSettings
       */
      Engine.prototype.init = function init(cacheSettings) {
        if (!angular.isObject(cacheSettings)) {
          return this.init({key: cacheSettings});
        }

        if (cacheSettings.key === false) {
          this.enabled = false;
        } else if (cacheSettings.key === true) {
          // do nothing
        } else if (angular.isString(cacheSettings.key)) {
          this.template = cacheSettings.key;
        } else if (angular.isFunction(cacheSettings.key)) {
          this.getKey = cacheSettings.key;
        } else {
          throw angular.$$minErr('$xResource')('badmember', 'cacheKey property is not valid.');
        }

        if (angular.isDefined(cacheSettings.split) && !angular.isObject(cacheSettings.split)) {
          throw angular.$$minErr('$xResource')('badmember', 'cacheSplit property must be an object.');
        }

        if (angular.isDefined(cacheSettings.params)) {
          angular.extend(this.paramDefaults, cacheSettings.params);
        }

        this.splitProperties = [];
        this.splitConfigs = cacheSettings.split || {};
        var _this = this;
        angular.forEach(this.splitConfigs, function(config, property) {
          _this.splitProperties.push(property);
        });
      };

      /**
       * Extracts params from an object
       *
       * @param object  data        Object containing data
       * @param object  params      List of parameters to extract
       * @param boolean removeLinks If true, links ('@id') without correspondaces, will be let as it ('@id').Otherwise, the params will contains undefined
       *
       * @return object
       */
      Engine.prototype.extractParams = function extractParams(data, params, removeLinks) {
        if (angular.isUndefined(removeLinks)) {
          removeLinks = true;
        }

        var ids = {};
        params = angular.extend({}, params);
        angular.forEach(params, function(value, key){
          if (angular.isFunction(value)) { value = value(); }
          if (value && value.charAt && value.charAt(0) === '@') {
            var linked = pathExplorer.getElement(data, value.substr(1));
            ids[key] = angular.isUndefined(linked) && !removeLinks ? value : linked;
          } else {
            ids[key] = value;
          }
        });
        return ids;
      };

      /**
       * Retreive list of params for template
       *
       * @param object  callParams  List of parameters passed in original resource's call
       * @param object  callData    Data passed in original resource's call
       * @param boolean removeLinks @see extractParams
       * @return object
       */
      Engine.prototype.getTemplateParams = function getTemplateParams(callParams, callData, removeLinks) {
        return angular.extend({}, this.extractParams(callData, this.paramDefaults, removeLinks), callParams);
      };

      /**
       * Retreives the cache key
       *
       * @param object templateParams List of parameters to apply in template
       *
       * @return string
       */
      Engine.prototype.getKey = function getKey(templateParams) {
        return $xResourceConfig.prefix + templateEngine.render(this.template, templateParams);
      };

      /**
       * Split a resource
       *
       * @param object resource       Resource to split
       * @param object templateParams List of resource's templateParams
       */
      Engine.prototype.splitResource = function splitResource(resource, templateParams) {
        var _this = this;
        angular.forEach(this.splitProperties.sort().reverse(), function(propertyPath) {
          var engine = new Engine(_this.template + '/' + propertyPath, templateParams, _this.splitConfigs[propertyPath]);
          pathExplorer.changeElement(resource, propertyPath, function(element) {
            if (element === null) {
              return null;
            }

            var ref = engine.store(element, {}, element);
            if (angular.isDefined(ref)) {
              return '#' + ref;
            }

            return undefined;
          });
        });
      };

      /**
       * Store a resource in cache
       *
       * @param object resource   Ressource to store
       * @param object callParams List of parameters passed in original resource's
       */
      Engine.prototype.store = function store(resource, callParams) {
        if (!this.enabled) {
          return;
        }

        resource = angular.copy(resource);

        if (this.splitProperties.length) {
          this.splitResource(resource, this.getTemplateParams(callParams, resource, false));
        }
        var key = this.getKey(this.getTemplateParams(callParams, resource), resource);
        $xResourceCacheEngine.put(key, resource);

        return key;
      };

      /**
       * Join a splitted resource
       *
       * @param object resource Ressource to join
       */
      Engine.prototype.joinResource = function joinResource(resource) {
        var _this = this;
        angular.forEach(this.splitProperties.sort(), function(propertyPath) {
          var engine = new Engine(null, {}, _this.splitConfigs[propertyPath]);
          pathExplorer.changeElement(resource, propertyPath, function(element) {
            if (angular.isString(element) && element[0] === '#') {
              var restored = $xResourceCacheEngine.get(element.substr(1));
              engine.joinResource(restored);
              return restored;
            } else {
              return element;
            }
          });
        });
      };

      /**
       * Retreive a ressource from cache
       *
       * @param object callParams List of parameters passed in original resource's call
       * @param object callData   Data passed in original resource's call
       *
       * @return mixed
       */
      Engine.prototype.fetch = function fetch(callParams, callData) {
        if (!this.enabled) {
          return;
        }

        var key = this.getKey(this.getTemplateParams(callParams, callData), null),
            resource = $xResourceCacheEngine.get(key);

        if (angular.isUndefined(resource)) {
          return resource;
        }

        if (this.splitProperties.length) {
          this.joinResource(resource);
        }

        return resource;
      };

      var pathExplorer = new PathExplorer(),
          templateEngine = new TemplateEngine();

      var cacheWrapper = function cacheWrapper(call, url, paramDefaults, action, cacheSettings) {
        var hasBody = function hasBody() {
          return /^(POST|PUT|PATCH)$/i.test(action.method);
        };

        /**
         * Parse call's arguments to determine which is params, data, success and error
         */
        var parseArguments = function parseArguments(a1, a2, a3, a4) {
          var params = {}, data, success, error;
          /* jshint -W086 */ /* (purposefully fall through case statements) */
          switch(arguments.length) {
          case 4:
            error = a4;
            success = a3;
            //fallthrough
          case 3:
          case 2:
            if (angular.isFunction(a2)) {
              if (angular.isFunction(a1)) {
                success = a1;
                error = a2;
                break;
              }
              success = a2;
              error = a3;
              //fallthrough
            } else {
              params = a1;
              data = a2;
              success = a3;
              break;
            }
          case 1:
            if (angular.isFunction(a1)) {
              success = a1;
            }
            else if (hasBody()) {
              data = a1;
            }
            else {
              params = a1;
            }
            break;
          case 0: break;
          default:
            throw angular.$$minErr('$xResource')('badargs',
              'Expected up to 4 arguments [params, data, success, error], got {0} arguments',
              arguments.length);
          }
          return {
            params: params,
            data: data,
            success: success,
            error: error,
          };
        };
        var engine = new Engine(action.url || url, angular.extend({}, paramDefaults, action.params), cacheSettings);

        return function () {
          var response = call.apply(this, arguments);
          var parsedArguments = parseArguments.apply(this, arguments);

          var stored = engine.fetch(parsedArguments.params, parsedArguments.data);
          if (angular.isDefined(stored)) {
            angular.extend(response, stored);
            response.$cache = stored.$cache;
          }

          response.$promise.then(function() {
            response.$cache = response.$cache || {updated: new Date().getTime()};
            response.$cache.stale = false;
            engine.store(response, parsedArguments.params);
          });

          return response;
        };
      };

      var extractResponse = function(data, accessProperty) {
        if (angular.isDefined(data[accessProperty])) {
          return data[accessProperty];
        } else {
          $log.error(
            'Error in resource configuration. Expected response to contain a property "' + accessProperty + '" but got ' + JSON.stringify(data)
          );
        }

        return data;
      };

      return function(url, paramDefaults, actions, options) {
        actions = angular.extend({}, provider.defaults.actions, actions);
        angular.forEach(actions, function(action) {
          if (angular.isDefined(action.$accessProperty)) {
            action.transformResponse = $http.defaults.transformResponse.concat([function(data) {
              return extractResponse(data, action.$accessProperty);
            }]);
          }
        });

        var resource = $resource(url, paramDefaults, actions, options);

        angular.forEach(actions, function(action, name) {
          if (angular.isDefined(action.$cache) && action.$cache !== false) {
            resource[name] = cacheWrapper(resource[name], url, paramDefaults, action, action.$cache);
          }
        });

        return resource;
      };
    }];
  });
