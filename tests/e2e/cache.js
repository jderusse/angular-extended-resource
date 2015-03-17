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
    var $localForage, $xResourceCacheEngine;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $xResourceCacheEngine = $injector.get('$xResourceCacheEngine');
      });

      $localForage.clear();
      $localForage.setItem('/foo', [new Date().getTime(), 'foo']).then(function() {
        $localForage.setItem('/bar', [new Date().getTime() - 864000001, 'bar']).then(function() {
          $xResourceCacheEngine.gc();
        });
      });
    });

    it('should delete old keys', function() {
      $localForage.getItem('/foo', function(value) {
        expect(value).toBeDefined();
      });
      $localForage.getItem('/bar', function(value) {
        expect(value).toBeUndefined();
      });
    });
  });

  describe('running Garbage Collector with small TTL', function() {
    var $localForage, $xResourceCacheEngine, $xResourceConfig;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $xResourceCacheEngine = $injector.get('$xResourceCacheEngine');
        $xResourceConfig = $injector.get('$xResourceConfig');
      });

      $localForage.clear().then(function() {
        $localForage.setItem('/foo', [new Date().getTime() - 10, 'foo']).then(function() {
          $xResourceCacheEngine.gc();
          $xResourceConfig.ttl = 9;
          $xResourceCacheEngine.gc();
        });
      });
    });

    afterEach(function() {
      $xResourceConfig.ttl = 864000000;
    });

    it('should delete old keys', function() {
      $localForage.getItem('/foo', function(value) {
        expect(value).toBeUndefined();
      });
    });
  });

  describe('calling API', function() {
    var resource, $httpBackend, $localForage;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $httpBackend = $injector.get('$httpBackend');
      });
      $localForage.clear();
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
      $localForage.getItem('/customers/123', function(value) {
        expect(value).toBeDefined();
      });
    });
  });

  describe('calling API with prefix', function() {
    var resource, $httpBackend, $localForage, $xResourceConfig;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $httpBackend = $injector.get('$httpBackend');
        $xResourceConfig = $injector.get('$xResourceConfig');
      });

      $localForage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({id: 1});
      $xResourceConfig.prefix = 'foo';

      resource = Customer.get({id: 123});
      $httpBackend.flush();
    });
    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
      $xResourceConfig.prefix = '';
    });

    it('should store data on localStorage', function() {
      $localForage.getItem('foo/customers/123', function(value) {
        expect(value).toBeDefined();
      });
    });
  });

  describe('calling API with multiple resource format', function() {
    var resource, resources, $httpBackend, $localForage;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $httpBackend = $injector.get('$httpBackend');
      });

      $localForage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({id: 1, name: 'foo'});
      $httpBackend.when('GET', '/customers')
        .respond([{id: 123}, {id: 456}]);

      Customer.get({id: 123});
      $httpBackend.flush();
      Customer.query();
      $httpBackend.flush();
      resource = Customer.get({id: 123});
      resources = Customer.query();
    });

    it('should retreive merged data', function() {
      expect(resource).toBeDefined();
      resource.$cachePromise.then(function() {
        expect(resource.id).toEqual(123);
        expect(resource.name).toBeDefined();
        expect(resource.name).toEqual('foo');
      });
      expect(resources).toBeDefined();
      resources.$cachePromise.then(function() {
        expect(resources[0].id).toEqual(123);
        expect(resources[0].name).toBeDefined();
        expect(resources[0].name).toEqual('foo');
      });
    });
  });
});
