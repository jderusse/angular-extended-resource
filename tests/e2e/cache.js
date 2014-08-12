'use strict';

describe('A service using $xResource', function() {
  var Customer;
  beforeEach(function() {
    module('exResource');
    inject(function($injector) {
      Customer = $injector.get('$xResource')('/customers/:id', {id: '@id'});
    });
  });

  describe('calling action query', function() {
    var resource;
    beforeEach(function() {
      resource = Customer.query();
    });

    it('should return a resource without cache metadata', function() {
      expect(resource).toBeDefined();
      expect(resource.$promise).toBeDefined();
      expect(resource.$cache).toBeUndefined();
    });
  });

  describe('deleting a Customer', function() {
    var resource;
    beforeEach(function() {
      resource = Customer.delete({id: 1});
    });

    it('should return a resource without cache metadata', function() {
      expect(resource).toBeDefined();
      expect(resource.$promise).toBeDefined();
      expect(resource.$cache).toBeUndefined();
    });
  });

  describe('running Garbage Collector', function() {
    var $window, $xResourceCacheEngine;
    beforeEach(function() {
      inject(function($injector) {
        $window = $injector.get('$window');
        $xResourceCacheEngine = $injector.get('$xResourceCacheEngine');
      });

      $window.localStorage.clear();
      $window.localStorage['/foo'] = JSON.stringify([new Date().getTime(), 'foo']);
      $window.localStorage['/bar'] = JSON.stringify([new Date().getTime() - 864001, 'bar']);
      $xResourceCacheEngine.gc();
    });

    it('should delete old keys', function() {
      expect($window.localStorage['/foo']).toBeDefined();
      expect($window.localStorage['/bar']).toBeUndefined();
    });
  });

  describe('running Garbage Collector with small TTL', function() {
    var $window, $xResourceCacheEngine, $xResourceConfig;
    beforeEach(function() {
      inject(function($injector) {
        $window = $injector.get('$window');
        $xResourceCacheEngine = $injector.get('$xResourceCacheEngine');
        $xResourceConfig = $injector.get('$xResourceConfig');
      });

      $window.localStorage.clear();
      $window.localStorage['/foo'] = JSON.stringify([new Date().getTime() - 10, 'foo']);
      $xResourceCacheEngine.gc();
      $xResourceConfig.ttl = 9;
      $xResourceCacheEngine.gc();
    });

    it('should delete old keys', function() {
      expect($window.localStorage['/foo']).toBeUndefined();
    });
  });

  describe('calling API', function() {
    var resource, $httpBackend, $window;
    beforeEach(function() {
      inject(function($injector) {
        $window = $injector.get('$window');
        $httpBackend = $injector.get('$httpBackend');
      });
      $window.localStorage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({id: 1});

      resource = Customer.get({id: 123});
      $httpBackend.flush();
    });
    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should define $cache property', function() {
      expect(resource.$cache).toBeDefined();
      expect(resource.$cache.stale).toBe(false);
    });
    it('should store data on localStorage', function() {
      expect($window.localStorage['/customers/123']).toBeDefined();
    });
  });

  describe('calling API with prefix', function() {
    var resource, $httpBackend, $window, $xResourceConfig;
    beforeEach(function() {
      inject(function($injector) {
        $window = $injector.get('$window');
        $httpBackend = $injector.get('$httpBackend');
        $xResourceConfig = $injector.get('$xResourceConfig');
      });

      $window.localStorage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({id: 1});
      $xResourceConfig.prefix = 'foo';

      resource = Customer.get({id: 123});
      $httpBackend.flush();
    });
    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should store data on localStorage', function() {
      expect($window.localStorage['foo/customers/123']).toBeDefined();
    });
  });
});
