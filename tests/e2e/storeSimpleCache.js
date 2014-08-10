'use strict';

describe('A service using $cResource', function() {
  var Customer;
  beforeEach(function() {
    module('cResource');
  });

  var fixtureCustomer = {
    id: 123,
    name: 'foo'
  };

  var dataprovider = [
    {config: {$cache: true}, result:[{key: '/customers/123', value: fixtureCustomer}]},
    {config: {$cache: false}, result:[]},
    {config: {$cache: 'foo/:id'}, result:[{key: 'foo/123', value: fixtureCustomer}]},
    {config: {$cache: function(p) {return 'foo/' + p.id;}}, result:[{key: 'foo/123', value: fixtureCustomer}]},
    {config: {$cache: {key: true}}, result:[{key: '/customers/123', value: fixtureCustomer}]},
    {config: {$cache: {key: false}}, result:[]},
    {config: {$cache: {key: 'foo/:id'}}, result:[{key: 'foo/123', value: fixtureCustomer}]},
    {config: {$cache: {key: function(p) {return 'foo/' + p.id;}}}, result:[{key: 'foo/123', value: fixtureCustomer}]},
    {config: {}, result:[]},
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
