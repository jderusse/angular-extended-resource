'use strict';

angular.module('cResource', ['ngResource'])
  .provider('$cResource', function() {
    var provider = this;

    this.defaults = {
      ttl: 864000,
      actions: {
        'get':    {method:'GET', $cache:true},
        'query':  {method:'GET', $cache:{key:true, splitKey: true}, isArray:true},
      }
    };

    this.$get = function($resource, $window, $interval) {
      function Route(template, defaults) {
        this.template = template;
        this.defaults = defaults || {};
      }

      Route.prototype = {
        /**
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
        encodeUriSegment: function(val) {
          return this.encodeUriQuery(val, true).
            replace(/%26/gi, '&').
            replace(/%3D/gi, '=').
            replace(/%2B/gi, '+');
        },
        /**
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
        encodeUriQuery: function(val, pctEncodeSpaces) {
          return encodeURIComponent(val).
            replace(/%40/gi, '@').
            replace(/%3A/gi, ':').
            replace(/%24/g, '$').
            replace(/%2C/gi, ',').
            replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
        },
        generateUrl: function(params, actionUrl) {
          var self = this,
              url = actionUrl || self.template,
              val,
              encodedVal;

          var urlParams = {};
          angular.forEach(url.split(/\W/), function(param){
            if (param === 'hasOwnProperty') {
              throw angular.$$minErr('$cRoute')('badname', 'hasOwnProperty is not a valid parameter name.');
            }
            if (!(/^\\d+$/.test(param)) && param &&
                 (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url))) {
              urlParams[param] = true;
            }
          });
          url = url.replace(/\\:/g, ':');

          params = params || {};
          angular.forEach(urlParams, function(_, urlParam){
            val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
            if (angular.isDefined(val) && val !== null) {
              encodedVal = self.encodeUriSegment(val);
              url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), function(match, p1) {
                return encodedVal + p1;
              });
            } else {
              url = url.replace(new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g'), function(match,
                  leadingSlashes, tail) {
                if (tail.charAt(0) === '/') {
                  return tail;
                } else {
                  return leadingSlashes + tail;
                }
              });
            }
          });

          // strip trailing slashes and set the url
          url = url.replace(/\/+$/, '') || '/';
          // then replace collapse `/.` if found in the last URL path segment before the query
          // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
          url = url.replace(/\/\.(?=\w+($|\?))/, '.');
          // replace escaped `/\.` with `/.`
          return url.replace(/\/\\\./, '/.');
        }
      };

      function Cache(ttl) {
        this.ttl = ttl;
      }

      Cache.prototype = {
        put: function(key, value) {
          var o = {
            m: value.$cacheMetadata,
            v: angular.copy(value)
          };
          delete o.v.$promise;
          delete o.v.$resolved;
          delete o.v.$cacheMetadata;
          delete o.m.stale;

          var encoded = JSON.stringify(o);
          if (encoded  === undefined) {
            delete $window.localStorage[key];
          } else {
            $window.localStorage[key] = encoded;
          }
        },
        get: function(key) {
          var data = $window.localStorage[key];
          if (data === undefined || data === 'undefined') {
            return undefined;
          }
          var s = JSON.parse(data);
          var value = s.v;
          value.$cacheMetadata = s.m;
          return value;
        },
        gc: function() {
          var self = this;
          var now = new Date().getTime();
          angular.forEach($window.localStorage, function(data, index) {
            if (data !== undefined && data !== 'undefined') {
              var s = JSON.parse(data);
              if (angular.isObject(s) && s.m && s.m.updated) {
                if (new Date(s.m.updated).getTime() + self.ttl < now) {
                  delete $window.localStorage[index];
                }
              }
            }
          });
        }
      };

      function Helper(action) {
        this.action = action;
      }

      Helper.prototype = {
        extractParams: function(data, actionParams, paramDefaults) {
          var ids = {};
          actionParams = angular.extend({}, paramDefaults, actionParams);
          angular.forEach(actionParams, function(value, key){
            if (angular.isFunction(value)) { value = value(); }
            ids[key] = value && value.charAt && value.charAt(0) === '@' ?
              this.lookupDottedPath(data, value.substr(1)) : value;
          });
          return ids;
        },
        hasBody: function() {
          return /^(POST|PUT|PATCH)$/i.test(this.action.method);
        },
        MEMBER_NAME_REGEX: /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/,
        isValidDottedPath: function(path) {
          return (path !== null && path !== '' && path !== 'hasOwnProperty' &&
              this.MEMBER_NAME_REGEX.test('.' + path));
        },
        lookupDottedPath: function(obj, path) {
          if (!this.isValidDottedPath(path)) {
            throw angular.$$minErr('badmember', 'Dotted member path "@{0}" is invalid.', path);
          }
          var keys = path.split('.');
          for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
            var key = keys[i];
            obj = (obj !== null) ? obj[key] : undefined;
          }
          return obj;
        },
        parseArguments: function(a1, a2, a3, a4) {
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
            else if (this.hasBody()) {
              data = a1;
            }
            else {
              params = a1;
            }
            break;
          case 0: break;
          default:
            throw angular.$$minErr('$cResource')('badargs',
              'Expected up to 4 arguments [params, data, success, error], got {0} arguments',
              arguments.length);
          }

          return {
            params: params,
            data: data,
            success: success,
            error: error,
          };
        }
      };

      var cache = new Cache(provider.defaults.ttl);
      $interval(function() {cache.gc();}, 30000);
      cache.gc();

      var setMetadata = function(key, value) {
        var stored = cache.get(key);
        value.$cacheMetadata = stored && stored.$cacheMetadata || {created: new Date()};
        value.$cacheMetadata.updated = new Date();
        value.$cacheMetadata.stale = true;

        return value;
      };

      var simpleCacheWrapper = function(call, url, action) {
        var getKey = function(callArguments) {
          var helper = new Helper(action);
          var route;
          if (action.$cache.key === true) {
            route = new Route(url);
          } else if(angular.isString(action.$cache.key)) {
            route = new Route(action.$cache);
          } else {
            throw angular.$$minErr('$cResource')('badmember', 'cache property is not valid.');
          }

          var parsedArguments = helper.parseArguments.apply(helper, callArguments);
          var routeParams = angular.extend({}, helper.extractParams(parsedArguments.data, action.params || {}), parsedArguments.params);

          return route.generateUrl(routeParams, action.url);
        };

        return function () {
          var response = call.apply(this, arguments);
          var key = getKey(arguments);

          angular.extend(response, cache.get(key));
          setMetadata(key, response);

          response.$promise.then(function(item) {
            cache.put(key, setMetadata(key, item));
            setMetadata(key, response);
            response.$cacheMetadata.stale = false;
          });

          return response;
        };
      };

      var splittedCacheWrapper = function(call, url, action) {
        var helper = new Helper(action);
        var mainRoute;
        if (action.$cache.key === true) {
          mainRoute = new Route(url);
        } else if(angular.isString(action.$cache.key)) {
          mainRoute = new Route(action.$cache.key);
        } else {
          throw angular.$$minErr('$cResource')('badmember', 'cache property is not valid.');
        }
        var splitRoute;
        if (action.$cache.splitKey === true) {
          splitRoute = new Route(url);
        } else if(angular.isString(action.$cache.splitKey)) {
          splitRoute = new Route(action.$cache.splitKey);
        } else {
          throw angular.$$minErr('$cResource')('badmember', 'cache property is not valid.');
        }

        var getMainKey = function(callArguments) {
          var parsedArguments = helper.parseArguments.apply(helper, callArguments);
          var routeParams = angular.extend({}, helper.extractParams(parsedArguments.data, action.params || {}), parsedArguments.params);

          return mainRoute.generateUrl(routeParams, action.url);
        };

        var getSplitKey = function(callArguments, item) {
          var parsedArguments = helper.parseArguments.apply(helper, callArguments);
          var routeParams = angular.extend({}, helper.extractParams(parsedArguments.data, action.params || {}), helper.extractParams(item, action.params || {}), parsedArguments.params);

          return splitRoute.generateUrl(routeParams, action.url);
        };

        return function () {
          var response = call.apply(this, arguments);
          var mainKey = getMainKey(arguments);

          response.lengh = 0;
          angular.forEach(cache.get(mainKey) || [], function(splitKey) {
            response.push(cache.get(splitKey));
          });
          setMetadata(mainKey, response);

          response.$promise.then(function(items) {
            var resourcesReference = [];
            angular.forEach(items, function(item) {
              var splitKey = getSplitKey(arguments, item);
              cache.put(splitKey, setMetadata(splitKey, item));
              resourcesReference.push(splitKey);
            });

            cache.put(mainKey, setMetadata(mainKey, resourcesReference));

            setMetadata(mainKey, response);
            response.$cacheMetadata.stale = false;
          });

          return response;
        };
      };

      return function(url, paramDefaults, actions, options) {
        actions = angular.extend({}, provider.defaults.actions, actions);
        var resource = $resource(url, paramDefaults, actions, options);

        angular.forEach(actions, function(action, name) {
          if (!angular.isObject(action.$cache)) {
            action.$cache = {key: action.$cache};
          }

          if (angular.isDefined(action.$cache.key) && action.$cache.key !== false) {
            if (action.isArray && action.$cache.splitKey) {
              resource[name] = splittedCacheWrapper(resource[name], url, action);
            } else {
              resource[name] = simpleCacheWrapper(resource[name], url, action);
            }
          }
        });

        return resource;
      };
    };
  });
