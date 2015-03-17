"use strict";

angular.module("exResource", [ "ngResource", "LocalForageModule" ]).run([ "$interval", "$xResourceCacheEngine", function($interval, $xResourceCacheEngine) {
    $interval(function() {
        $xResourceCacheEngine.gc();
    }, 3e5);
    $xResourceCacheEngine.gc();
} ]).constant("$xResourceConfig", {
    ttl: 864e6,
    prefix: ""
}).factory("$xResourceCacheEngine", [ "$window", "$xResourceConfig", "$localForage", function($window, $xResourceConfig, $localForage) {
    return {
        put: function put(key, value) {
            var store = function(value) {
                delete value.$promise;
                delete value.$cachePromise;
                delete value.$resolved;
                delete value.$cache;
                $localForage.setItem(key, [ new Date().getTime(), value ]);
            };
            if (angular.isArray(value)) {
                store(angular.copy(value));
            } else {
                this.get(key).then(function(cachedValue) {
                    store(angular.extend({}, cachedValue, value));
                });
            }
        },
        get: function get(key) {
            return $localForage.getItem(key).then(function(data) {
                if (angular.isDefined(data)) {
                    var value = data[1];
                    value.$cache = {
                        updated: data[0],
                        stale: true
                    };
                    return value;
                }
            });
        },
        gc: function gc() {
            var now = new Date().getTime();
            $localForage.keys().then(function(keys) {
                angular.forEach(keys, function(key) {
                    $localForage.getItem(key).then(function(data) {
                        if (data[0] + $xResourceConfig.ttl < now) {
                            $localForage.removeItem(key);
                        }
                    });
                });
            });
        }
    };
} ]).provider("$xResource", function() {
    var provider = this;
    this.defaults = {
        actions: {
            get: {
                method: "GET",
                $cache: true
            },
            query: {
                method: "GET",
                $cache: {
                    key: true,
                    split: {
                        "*": true
                    }
                },
                isArray: true
            }
        }
    };
    this.$get = [ "$window", "$http", "$log", "$resource", "$xResourceConfig", "$xResourceCacheEngine", "$q", function($window, $http, $log, $resource, $xResourceConfig, $xResourceCacheEngine, $q) {
        function TemplateEngine() {
            this._parsed = {};
        }
        TemplateEngine.prototype.encodeUriSegment = function encodeUriSegment(val) {
            return this.encodeUriQuery(val, true).replace(/%26/gi, "&").replace(/%3D/gi, "=").replace(/%2B/gi, "+");
        };
        TemplateEngine.prototype.encodeUriQuery = function encodeUriQuery(val, pctEncodeSpaces) {
            return encodeURIComponent(val).replace(/%40/gi, "@").replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, pctEncodeSpaces ? "%20" : "+");
        };
        TemplateEngine.prototype.extractParams = function extractParams(template) {
            if (!this._parsed[template]) {
                var url = template, urlParams = {};
                angular.forEach(url.split(/\W/), function(param) {
                    if (param === "hasOwnProperty") {
                        throw angular.$$minErr("$xResource")("badname", "hasOwnProperty is not a valid parameter name.");
                    }
                    var paramRegExp = new RegExp("(^|[^\\\\]):" + param + "(\\W|$)", "g");
                    if (param && !/^\\d+$/.test(param) && paramRegExp.test(url)) {
                        urlParams[param] = paramRegExp;
                    }
                });
                this._parsed[template] = urlParams;
            }
            return this._parsed[template];
        };
        TemplateEngine.prototype.render = function render(template, params) {
            var _this = this;
            var url = template;
            var urlParams = this.extractParams(template);
            params = params || {};
            angular.forEach(urlParams, function(regExp, urlParam) {
                var val = params.hasOwnProperty(urlParam) ? params[urlParam] : undefined, encodedVal;
                if (angular.isDefined(val) && val !== null) {
                    encodedVal = _this.encodeUriSegment(val);
                    url = url.replace(regExp, function(_, head, tail) {
                        return head + encodedVal + tail;
                    });
                } else {
                    url = url.replace(regExp, function(_, head, tail) {
                        return head + tail;
                    });
                }
            });
            url = url.replace(/\\:/g, ":");
            url = url.replace(/\/+$/, "") || "/";
            url = url.replace(/\/\.(?=\w+($|\?))/, ".");
            return url.replace(/\/\./, "/.");
        };
        function PathExplorer() {}
        PathExplorer.MEMBER_NAME_REGEX = /^(\.(\*|[a-zA-Z_$][0-9a-zA-Z_$]*))+$/;
        PathExplorer.prototype.isValidDottedPath = function isValidDottedPath(path) {
            return path !== null && path !== "" && path !== "hasOwnProperty" && PathExplorer.MEMBER_NAME_REGEX.test("." + path);
        };
        PathExplorer.prototype.getElement = function getElement(obj, path) {
            if (!this.isValidDottedPath(path)) {
                throw angular.$$minErr("badmember", 'Dotted member path "@{0}" is invalid.', path);
            }
            var keys = path.split(".");
            for (var i = 0, ii = keys.length; i < ii && angular.isDefined(obj); i++) {
                var key = keys[i];
                obj = obj !== null ? obj[key] : undefined;
            }
            return obj;
        };
        PathExplorer.prototype.changeElement = function changeElement(object, path, callback) {
            var _this = this;
            if (path === "") {
                return callback(object);
            } else {
                if (!this.isValidDottedPath(path)) {
                    throw angular.$$minErr("$xResource")("badmember", 'Dotted member path "@{0}" is invalid.', path);
                }
                var keys = path.split(".");
                var key = keys.shift();
                var subPath = keys.join(".");
                if (key === "*") {
                    if (!angular.isArray(object)) {
                        throw angular.$$minErr("$xResource")("badmember", 'Path "*" point to a non-array object.', path);
                    }
                    angular.forEach(object, function(element, index) {
                        object[index] = _this.changeElement(element, subPath, callback);
                    });
                } else {
                    if (angular.isArray(object)) {
                        throw angular.$$minErr("$xResource")("badmember", 'Path "' + path + '" point to a array object.', path);
                    }
                    if (angular.isDefined(object[key])) {
                        object[key] = _this.changeElement(object[key], subPath, callback);
                    }
                }
                return object;
            }
        };
        function Engine(template, paramDefaults, cacheSettings) {
            this.enabled = true;
            this.template = template;
            this.paramDefaults = paramDefaults || {};
            this.init(cacheSettings);
        }
        Engine.prototype.init = function init(cacheSettings) {
            if (!angular.isObject(cacheSettings)) {
                return this.init({
                    key: cacheSettings
                });
            }
            if (cacheSettings.key === false) {
                this.enabled = false;
            } else if (cacheSettings.key === true) {} else if (angular.isString(cacheSettings.key)) {
                this.template = cacheSettings.key;
            } else if (angular.isFunction(cacheSettings.key)) {
                this.getKey = cacheSettings.key;
            } else {
                throw angular.$$minErr("$xResource")("badmember", "cacheKey property is not valid.");
            }
            if (angular.isDefined(cacheSettings.split) && !angular.isObject(cacheSettings.split)) {
                throw angular.$$minErr("$xResource")("badmember", "cacheSplit property must be an object.");
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
        Engine.prototype.extractParams = function extractParams(data, params, removeLinks) {
            if (angular.isUndefined(removeLinks)) {
                removeLinks = true;
            }
            var ids = {};
            params = angular.extend({}, params);
            angular.forEach(params, function(value, key) {
                if (angular.isFunction(value)) {
                    value = value();
                }
                if (value && value.charAt && value.charAt(0) === "@") {
                    var linked = pathExplorer.getElement(data, value.substr(1));
                    ids[key] = angular.isUndefined(linked) && !removeLinks ? value : linked;
                } else {
                    ids[key] = value;
                }
            });
            return ids;
        };
        Engine.prototype.getTemplateParams = function getTemplateParams(callParams, callData, removeLinks) {
            return angular.extend({}, this.extractParams(callData, this.paramDefaults, removeLinks), callParams);
        };
        Engine.prototype.getKey = function getKey(templateParams) {
            return $xResourceConfig.prefix + templateEngine.render(this.template, templateParams);
        };
        Engine.prototype.splitResource = function splitResource(resource, templateParams) {
            var _this = this;
            angular.forEach(this.splitProperties.sort().reverse(), function(propertyPath) {
                var engine = new Engine(_this.template + "/" + propertyPath.replace(/(^\*|\.\*)/, ""), templateParams, _this.splitConfigs[propertyPath]);
                pathExplorer.changeElement(resource, propertyPath, function(element) {
                    if (element === null) {
                        return null;
                    }
                    var ref = engine.store(element, {}, element);
                    if (angular.isDefined(ref)) {
                        return (angular.isArray(element) ? "#@" : "#$") + ref;
                    }
                    return undefined;
                });
            });
        };
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
        Engine.prototype.joinResource = function joinResource(resource) {
            var deferred = $q.defer();
            deferred.counter = 1;
            var resolve = function() {
                if (--deferred.counter === 0) {
                    deferred.resolve(resource);
                }
            };
            var _this = this;
            angular.forEach(this.splitProperties.sort(), function(propertyPath) {
                var engine = new Engine(null, {}, _this.splitConfigs[propertyPath]);
                pathExplorer.changeElement(resource, propertyPath, function(element) {
                    if (angular.isString(element)) {
                        var key = element.substr(0, 2);
                        if (key === "#$" || key === "#@") {
                            var restored = key === "#$" ? {} : [];
                            deferred.counter++;
                            $xResourceCacheEngine.get(element.substr(2)).then(function(cachedValue) {
                                angular.extend(restored, cachedValue);
                                engine.joinResource(restored).then(function() {
                                    resolve();
                                });
                            });
                            return restored;
                        } else {
                            return element;
                        }
                    } else {
                        return element;
                    }
                });
            });
            resolve();
            return deferred.promise;
        };
        Engine.prototype.fetch = function fetch(callParams, callData) {
            if (!this.enabled) {
                return;
            }
            var key = this.getKey(this.getTemplateParams(callParams, callData), null);
            var _this = this;
            var deferred = $q.defer();
            $xResourceCacheEngine.get(key).then(function(resource) {
                if (angular.isUndefined(resource)) {
                    deferred.resolve(resource);
                } else if (_this.splitProperties.length) {
                    _this.joinResource(resource).then(function() {
                        deferred.resolve(resource);
                    }, function(reason) {
                        deferred.reject(reason);
                    });
                } else {
                    deferred.resolve(resource);
                }
            });
            return deferred.promise;
        };
        var pathExplorer = new PathExplorer(), templateEngine = new TemplateEngine();
        var cacheWrapper = function cacheWrapper(call, url, paramDefaults, action, cacheSettings) {
            var hasBody = function hasBody() {
                return /^(POST|PUT|PATCH)$/i.test(action.method);
            };
            var parseArguments = function parseArguments(a1, a2, a3, a4) {
                var params = {}, data, success, error;
                switch (arguments.length) {
                  case 4:
                    error = a4;
                    success = a3;

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
                    } else {
                        params = a1;
                        data = a2;
                        success = a3;
                        break;
                    }

                  case 1:
                    if (angular.isFunction(a1)) {
                        success = a1;
                    } else if (hasBody()) {
                        data = a1;
                    } else {
                        params = a1;
                    }
                    break;

                  case 0:
                    break;

                  default:
                    throw angular.$$minErr("$xResource")("badargs", "Expected up to 4 arguments [params, data, success, error], got {0} arguments", arguments.length);
                }
                return {
                    params: params,
                    data: data,
                    success: success,
                    error: error
                };
            };
            var engine = new Engine(action.url || url, angular.extend({}, paramDefaults, action.params), cacheSettings);
            return function() {
                var deferred = $q.defer();
                var response = call.apply(this, arguments);
                response.$cachePromise = deferred.promise;
                var parsedArguments = parseArguments.apply(this, arguments);
                var fetchPromise = engine.fetch(parsedArguments.params, parsedArguments.data);
                if (angular.isDefined(fetchPromise)) {
                    fetchPromise.then(function(stored) {
                        if (angular.isUndefined(response.$cache) && angular.isDefined(stored)) {
                            angular.extend(response, stored);
                            response.$cache = stored.$cache;
                            deferred.resolve(response);
                        }
                    }, function(reason) {
                        deferred.reject(reason);
                    });
                } else {
                    deferred.resolve(response);
                }
                response.$promise.then(function() {
                    response.$cache = response.$cache || {
                        updated: new Date().getTime()
                    };
                    response.$cache.stale = false;
                    engine.store(response, parsedArguments.params);
                    deferred.resolve(response);
                });
                return response;
            };
        };
        var extractResponse = function(data, accessProperty) {
            if (angular.isDefined(data[accessProperty])) {
                return data[accessProperty];
            } else {
                $log.error('Error in resource configuration. Expected response to contain a property "' + accessProperty + '" but got ' + JSON.stringify(data));
            }
            return data;
        };
        return function(url, paramDefaults, actions, options) {
            actions = angular.extend({}, provider.defaults.actions, actions);
            angular.forEach(actions, function(action) {
                if (angular.isDefined(action.$accessProperty)) {
                    action.transformResponse = $http.defaults.transformResponse.concat([ function(data) {
                        return extractResponse(data, action.$accessProperty);
                    } ]);
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
    } ];
});