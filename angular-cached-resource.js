'use strict';

angular.module('cResource', ['ngResource'])
  .provider('$cResource', function() {
    var provider = this;

    this.defaults = {
      ttl: 864000,
      actions: {
        'get':    {method:'GET', $cache:true},
        'query':  {method:'GET', $cache:{key:true}, isArray:true},
      }
    };

    this.$get = function($resource, $window, $interval) {
      function Route() {
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
        generateUrl: function(template, params) {
          var self = this,
              url = template,
              val,
              encodedVal;

          var urlParams = {};
          angular.forEach(url.split(/\W/), function(param){
            if (param === 'hasOwnProperty') {
              throw angular.$$minErr('$cResource')('badname', 'hasOwnProperty is not a valid parameter name.');
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
          value.$cache = value.$cache || {};
          var o = [
            value.$cache.updated,
            angular.copy(value)
          ];
          delete o[1].$promise;
          delete o[1].$resolved;
          delete o[1].$cache;

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
          var value = s[1];
          value.$cache = {updated: s[0], stale: true};
          return value;
        },
        gc: function() {
          var self = this;
          var now = new Date().getTime();
          angular.forEach($window.localStorage, function(data, index) {
            if (data !== undefined && data !== 'undefined') {
              var s = JSON.parse(data);
              if (angular.isArray(s) && s.length > 1) {
                if (s[0] + self.ttl < now) {
                  delete $window.localStorage[index];
                }
              }
            }
          });
        }
      };

      function Helper() {
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

      var helper = new Helper();
      var route = new Route();
      var cache = new Cache(provider.defaults.ttl);
      $interval(function() {cache.gc();}, 30000);
      cache.gc();

      function Engine(template, defaultParams, cacheSettings) {
        this.enabled = true;
        this.template = template;
        this.defaultParams = defaultParams;
        this.init(cacheSettings);
      }

      Engine.prototype = {
        init: function(cacheSettings) {
          if (!angular.isObject(cacheSettings)) {
            return this.init({key: cacheSettings});
          }

          if (cacheSettings.key === false) {
            this.enabled = false;
          } else if (cacheSettings.key === true) {
            // do nothing
          } else if (angular.isString(cacheSettings.key)) {
            this.template = cacheSettings.key;
          } else {
            throw angular.$$minErr('$cResource')('badmember', 'cacheKey property is not valid.');
          }

          if (angular.isDefined(cacheSettings.split) && !angular.isObject(cacheSettings.split)) {
            throw angular.$$minErr('$cResource')('badmember', 'cacheSplit property must be an object.');
          }

          this.splitProperties = [];
          this.splitConfigs = cacheSettings.split || {};
          var self = this;
          angular.forEach(this.splitConfigs, function(config, property) {
            self.splitProperties.push(property);
          });
        },
        getKey: function(callParams, callData) {
          var routeParams = angular.extend({}, callData, helper.extractParams(callData, this.defaultParams || {}), callParams);

          return route.generateUrl(this.template, routeParams);
        },
        splitResource: function (resource) {
          var self = this;
          angular.forEach(this.splitProperties.sort().reverse(), function(propertyPath) {
            if (!helper.isValidDottedPath(propertyPath)) {
              throw angular.$$minErr('badmember', 'Dotted member path "@{0}" is invalid.', propertyPath);
            }

            var engine = new Engine(undefined, {}, self.splitConfigs[propertyPath]);
            var keys = propertyPath.split('.');
            var subItems = [resource];
            angular.forEach(keys, function(key, index) {
              var last = (index === keys.length - 1);
              var newSubItems = [];
              angular.forEach(subItems, function(subItem) {
                if (angular.isDefined(subItem[key])) {
                  if (angular.isArray(subItem[key])) {
                    newSubItems = newSubItems.concat(subItem[key]);
                    if (last) {
                      var cacheKeys = [];
                      angular.forEach(subItem[key], function(subItem) {
                        cacheKeys.push('#' + engine.store(subItem, {}, subItem));
                      });
                      subItem[key] = cacheKeys;
                    }
                  } else {
                    newSubItems.push(subItem[key]);
                    if (last) {
                      var cacheKey = engine.store(subItem[key], {}, subItem[key]);
                      subItem[key] = '#' + cacheKey;
                    }
                  }

                }
              });
              subItems = newSubItems;
            });
          });
        },
        store: function (resource, callParams, callData) {
          if (!this.enabled) {
            return;
          }

          resource = angular.copy(resource);

          this.splitResource(resource);
          var key = this.getKey(callParams, callData);
          cache.put(key, resource);

          return key;
        }
      };

      var simpleCacheWrapper = function(call, url, action, cacheSettings) {
        Helper.prototype.hasBody = function() {
          return /^(POST|PUT|PATCH)$/i.test(action.method);
        };
        var engine = new Engine(action.url || url, action.params, cacheSettings);

        return function () {
          var response = call.apply(this, arguments);
          // todo: removed when implement engine.fetch ?
          angular.extend(response, {$cache:{stale: true}});

          var parsedArguments = helper.parseArguments.apply(helper, arguments);
          response.$promise.then(function() {
            angular.extend(response, {$cache:{updated: new Date().getTime(), stale: false}});
            engine.store(response, parsedArguments.params, parsedArguments.data);
          });

          return response;
        };
      };

      return function(url, paramDefaults, actions, options) {
        actions = angular.extend({}, provider.defaults.actions, actions);
        var resource = $resource(url, paramDefaults, actions, options);

        angular.forEach(actions, function(action, name) {
          if (angular.isDefined(action.$cache) && action.$cache !== false) {
            resource[name] = simpleCacheWrapper(resource[name], url, action, action.$cache);
          }
        });

        return resource;
      };
    };
  });
