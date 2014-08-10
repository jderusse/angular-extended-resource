'use strict';

describe('A service using $cResource', function() {
  var Customer;
  beforeEach(function() {
    module('cResource');
  });

  var fixtureCustomer = {
    id: 123,
    name: 'foo',
    phones: [
      {
        id: 1,
        parentId: 321,
        number: 123,
        country: {
          id: 'fr',
          name: 'france'
        }
      },
      {
        id: 2,
        parentId: 321,
        number: 456,
        country: {
          id: 'fr',
          name: 'france'
        }
      }
    ]
  };
  var fixtureCustomerRef1 = {
    id: 123,
    name: 'foo',
    phones: ['#c/123/phones', '#c/123/phones']
  };
  var fixtureCustomerRef2 = {
    id: 123,
    name: 'foo',
    phones: []
  };
  var fixtureCustomerRef3 = {
    id: 123,
    name: 'foo',
    phones: ['#c/123/bar/1', '#c/123/bar/2']
  };
  var fixtureCustomerRef4 = {
    id: 123,
    name: 'foo',
    phones: ['#c/123/bar', '#c/123/bar']
  };
  var fixtureCustomerRef5 = {
    id: 123,
    name: 'foo',
    phones: ['#c/321/bar/1', '#c/321/bar/2']
  };
 var fixturePhone1 = {
    id: 1,
    parentId: 321,
    number: 123,
    country: {
      id: 'fr',
      name: 'france'
    }
  };
  var fixturePhone2 = {
    id: 2,
    parentId: 321,
    number: 456,
    country: {
      id: 'fr',
      name: 'france'
    }
  };
  var fixturePhone1Ref1 = {
    id: 1,
    parentId: 321,
    number: 123,
    country: '#c/123/bar/1/baz/fr'
  };
  var fixturePhone2Ref1 = {
    id: 2,
    parentId: 321,
    number: 456,
    country: '#c/123/bar/2/baz/fr'
  };
  var fixtureCountry = {
    id: 'fr',
    name: 'france'
  };

  var dataprovider = [
    {config: {$cache: {key: 'c/:name'}},
      result: [{key: 'c', value: fixtureCustomer}]},
    {config: {$cache: {key: 'c/:name', params: {name: '@name'}}},
      result: [{key: 'c/foo', value: fixtureCustomer}]},
    {config: {$cache: {key: 'c/:name', params: {name: 'bar'}}},
      result: [{key: 'c/bar', value: fixtureCustomer}]},
    {config: {$cache: {key: 'c/:name', params: {name: function() {return 'baz';}}}},
      result: [{key: 'c/baz', value: fixtureCustomer}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: true}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef1}, {key: 'c/123/phones', value: fixturePhone2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: false}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: function(p, i) {return 'c/' + p.id + '/bar/' + i.id;}}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef3}, {key: 'c/123/bar/1', value: fixturePhone1}, {key: 'c/123/bar/2', value: fixturePhone2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId'}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef4}, {key: 'c/123/bar', value: fixturePhone2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef3}, {key: 'c/123/bar/1', value: fixturePhone1}, {key: 'c/123/bar/2', value: fixturePhone2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {id: '@parentId', subId: '@id'}}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef5}, {key: 'c/321/bar/1', value: fixturePhone1}, {key: 'c/321/bar/2', value: fixturePhone2}]},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}, split: {country: {key: 'c/:id/bar/:subId/baz/:subSubId', params: {subSubId: '@id'}}}}}}},
      result: [{key: 'c/123', value: fixtureCustomerRef3}, {key: 'c/123/bar/1', value: fixturePhone1Ref1}, {key: 'c/123/bar/2', value: fixturePhone2Ref1}, {key: 'c/123/bar/1/baz/fr', value: fixtureCountry}, {key: 'c/123/bar/2/baz/fr', value: fixtureCountry}]},
  ];

  angular.forEach(dataprovider, function(data) {
    var config = data.config;
    var expectations = data.result;
    describe('calling a action with config ' + JSON.stringify(config), function() {
      var resource, $httpBackend, $window;
      beforeEach(function() {
        inject(function($injector) {
          $window = $injector.get('$window');
          $window.localStorage.clear();
          $httpBackend = $injector.get('$httpBackend');
          $httpBackend.when('GET', '/customers/123')
            .respond(fixtureCustomer);

          Customer = $injector.get('$cResource')('/customers/:id', {id: '@id'}, {
            get: angular.extend({}, {method: 'GET'}, config)
          });
        });
        resource = Customer.get({id: 123});
        $httpBackend.flush();
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      describe('when API respond', function() {
        it('should store "' + JSON.stringify(expectations) + '"', function() {
          angular.forEach(expectations, function(expectation) {
            expect($window.localStorage[expectation.key]).toBeDefined();
            expect(JSON.parse($window.localStorage[expectation.key])[1]).toEqual(expectation.value);
          });
          expect($window.localStorage.length).toBe(expectations.length);
        });
      });
    });
  });
});
