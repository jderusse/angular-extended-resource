'use strict';

angular.module('cResource', ['ngResource'])
   .factory('$cRoute', function() {
          function Route(template, defaults) {
      this.template = template;
      this.defaults = defaults || {};
      this.urlParams = {};
    }

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
    function encodeUriSegment(val) {
      return encodeUriQuery(val, true).
        replace(/%26/gi, '&').
        replace(/%3D/gi, '=').
        replace(/%2B/gi, '+');
    }

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
    function encodeUriQuery(val, pctEncodeSpaces) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    }

    Route.prototype = {
      generateUrl: function(params, actionUrl) {
        var self = this,
            url = actionUrl || self.template,
            val,
            encodedVal;

        var urlParams = self.urlParams = {};
        angular.forEach(url.split(/\W/), function(param){
          if (param === 'hasOwnProperty') {
            throw angular.$$minErr('$cRoute')('badname', "hasOwnProperty is not a valid parameter name.");
          }
          if (!(new RegExp("^\\d+$").test(param)) && param &&
               (new RegExp("(^|[^\\\\]):" + param + "(\\W|$)").test(url))) {
            urlParams[param] = true;
          }
        });
        url = url.replace(/\\:/g, ':');

        params = params || {};
        angular.forEach(self.urlParams, function(_, urlParam){
          val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
          if (angular.isDefined(val) && val !== null) {
            encodedVal = encodeUriSegment(val);
            url = url.replace(new RegExp(":" + urlParam + "(\\W|$)", "g"), function(match, p1) {
              return encodedVal + p1;
            });
          } else {
            url = url.replace(new RegExp("(\/?):" + urlParam + "(\\W|$)", "g"), function(match,
                leadingSlashes, tail) {
              if (tail.charAt(0) == '/') {
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

    return function(url) {
      return new Route(url);
    };
  })
  .factory('$cEngine', function() {
    return function() {
      return {
        put: function(key, value) {
          var encoded = JSON.stringify(value);
          if (value === undefined || encoded  === undefined) {
            delete localStorage[key];
          } else {
            localStorage[key] = encoded;
          }
        },
        get: function(key) {
          var data = localStorage[key];
          if (data === undefined) {
            return undefined;
          }
          return JSON.parse(data);
        }
      };
    };
  })
  .factory('$cHelper', function($cRoute) {
    return function(action) {
      return {
        extractHttpConfig: function(action, data) {
          var httpConfig = {};
          angular.forEach(action, function(value, key) {
            if (key != 'params' && key != 'isArray' && key != 'interceptor') {
              httpConfig[key] = angular.copy(value);
            }
          });

          if (this.hasBody) {
            httpConfig.data = data;
          }

          return httpConfig;
        },
        extractParams: function(data, actionParams, paramDefaults) {
          var ids = {};
          actionParams = angular.extend({}, paramDefaults, actionParams);
          angular.forEach(actionParams, function(value, key){
            if (angular.isFunction(value)) { value = value(); }
            ids[key] = value && value.charAt && value.charAt(0) == '@' ?
              this.lookupDottedPath(data, value.substr(1)) : value;
          });
          return ids;
        },
        hasBody: function() {
          return /^(POST|PUT|PATCH)$/i.test(action.method);
        },
        MEMBER_NAME_REGEX: /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/,
        isValidDottedPath: function(path) {
          return (path != null && path !== '' && path !== 'hasOwnProperty' &&
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
            if (angular.isFunction(a1)) success = a1;
            else if (this.hasBody()) data = a1;
            else params = a1;
            break;
          case 0: break;
          default:
            throw angular.$$minErr('$cResource')('badargs',
              "Expected up to 4 arguments [params, data, success, error], got {0} arguments",
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
    };
  })
  .factory('$cResource', function($resource, $cEngine, $cRoute, $cHelper) {
    var DEFAULT_ACTIONS = {
      'get':    {method:'GET', $cache:true},
      'query':  {method:'GET', $cache:true, isArray:true},
    };

    var engine = $cEngine();

    var cacheWrapper = function(call, url, action) {
      var helper = $cHelper(action);
      var route;
      if (action.$cache === true) {
        route = $cRoute(url);
      } else if(angular.isString(action.$cache)) {
        route = $cRoute(action.$cache);
      } else if(angular.isObject(action.$cache) && action.$cache.key !== undefined) {
        route = $cRoute(action.$cache.key);
      } else {
        throw angular.$$minErr('$cResource')('badmember', "cache property is not valid.");
      }

      var getKey = function(callArguments) {
        var parsedArguments = helper.parseArguments.apply(helper, callArguments);
        var routeParams = angular.extend({}, helper.extractParams(parsedArguments.data, action.params || {}), parsedArguments.params);

        return route.generateUrl(routeParams, action.url);
      };

      var cleanItem = function(item) {
          var cleanedItem = angular.copy(item);
          delete cleanedItem.$promise;
          delete cleanedItem.$resolved;
          return cleanedItem;
      };

      return function () {
        var response = call.apply(this, arguments);
        var key = getKey(arguments);

        angular.extend(response, engine.get(key), {$cache: {stale: true}});

        response.$promise.then(function(item) {
          engine.put(key, cleanItem(item));
          angular.extend(response, {$cache: {stale: false}});
        });

        return response;
      };
    };

    return function(url, paramDefaults, actions, options) {
      actions = angular.extend({}, DEFAULT_ACTIONS, actions);
      var resource = $resource(url, paramDefaults, actions, options);

      angular.forEach(actions, function(action, name) {
        if (angular.isDefined(action.$cache) && action.$cache !== false) {
          resource[name] = cacheWrapper(resource[name], url, action);
        }
      });

      return resource;
    };
  });