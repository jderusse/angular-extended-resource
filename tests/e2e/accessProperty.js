'use strict';

describe('A service using $xResource', function() {
  var Customer;
  beforeEach(function() {
    module('exResource');
    inject(function($injector) {
      Customer = $injector.get('$xResource')('/customers/:id', {id: '@id'}, {
        get: {method: 'GET', $accessProperty: 'cus'}
      });
    });
  });

  describe('calling correct API', function() {
    var resource, $httpBackend, $localForage;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $httpBackend = $injector.get('$httpBackend');
      });
      $localForage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({cus: {id: 1}});

      resource = Customer.get({id: 123});
      $httpBackend.flush();
    });
    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should contains the sub object', function() {
      delete resource.$cache;
      delete resource.$promise;
      delete resource.$resolved;
      expect(JSON.stringify(resource)).toEqual(JSON.stringify({id: 1}));
    });
  });

  describe('calling wrong API', function() {
    var resource, $httpBackend, $localForage;
    beforeEach(function() {
      inject(function($injector) {
        $localForage = $injector.get('$localForage');
        $httpBackend = $injector.get('$httpBackend');
      });
      $localForage.clear();
      $httpBackend.when('GET', '/customers/123')
        .respond({error: 'foo'});

      resource = Customer.get({id: 123});
      $httpBackend.flush();
    });
    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('should contains the sub object', function() {
      delete resource.$cache;
      delete resource.$promise;
      delete resource.$resolved;
      expect(JSON.stringify(resource)).toEqual(JSON.stringify({error: 'foo'}));
    });
  });
});
