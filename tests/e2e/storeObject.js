'use strict';

describe('A service using $cResource', function() {
  var Customer;
  beforeEach(function() {
    module('cResource');
  });

  var getFixtureCustomer = function(phones) {
    var template = {
      id: 123,
      name: 'foo',
    };
    return angular.extend({}, template, {phones: angular.isUndefined(phones) ? [getFixturePhone(1), getFixturePhone(2  )] : phones});
  };
  var getFixturePhone = function(template, country) {
    var templates = {
      1: {
        id: 12,
        parentId: 789,
        number: 1234,
      },
      2: {
        id: 34,
        parentId: 789,
        number: 5678,
      },
    };
    return angular.extend({}, templates[template], {country: angular.isUndefined(country) ? fixtureCountry : country});
  };
  var fixtureCountry = {
    id: 'fr',
    name: 'france'
  };
  var fixtureCustomer = getFixtureCustomer();

  var dataprovider = [
    {config: {},
      store: [],
      fetch: {}},

    // simple alias
    {config: {$cache: true},
      store: [
        {key: '/customers/123', value: fixtureCustomer}],
        fetch: fixtureCustomer},
    {config: {$cache: false},
      store: [],
      fetch: {}},
    {config: {$cache: 'foo/:id'},
      store: [
        {key: 'foo/123', value: fixtureCustomer}],
        fetch: fixtureCustomer},
    {config: {$cache: function(p) {return 'foo/' + p.id;}},
      store: [
        {key: 'foo/123', value: fixtureCustomer}],
      fetch: fixtureCustomer},

    // simple object
    {config: {$cache: {key: true}},
      store: [
        {key: '/customers/123', value: fixtureCustomer}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: false}},
      store: [],
      fetch: {}},
    {config: {$cache: {key: 'foo/:id'}},
      store: [
        {key: 'foo/123', value: fixtureCustomer}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: function(p) {return 'foo/' + p.id;}}},
      store: [
        {key: 'foo/123', value: fixtureCustomer}],
      fetch: fixtureCustomer},

    // params
    {config: {$cache: {key: 'c/:name'}},
      store: [
        {key: 'c', value: fixtureCustomer}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:name', params: {name: '@name'}}},
      store: [
        {key: 'c/foo', value: fixtureCustomer}],
      fetch: {}},
    {config: {$cache: {key: 'c/:name', params: {name: 'bar'}}},
      store: [
        {key: 'c/bar', value: fixtureCustomer}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:name', params: {name: function() {return 'baz';}}}},
      store: [
        {key: 'c/baz', value: fixtureCustomer}],
      fetch: fixtureCustomer},

    // split
    {config: {$cache: {key: 'c/:id', split: {'': {key: true}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer()}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split: {'': {key: false}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer()}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split:{phones: {key: true}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/phones', '#c/123/phones'])},
        {key: 'c/123/phones', value: getFixturePhone(2)}],
      fetch: getFixtureCustomer([getFixturePhone(2), getFixturePhone(2)])},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: false}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer([])}],
      fetch: getFixtureCustomer([])},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: function(p, i) {return 'c/' + p.id + '/bar/' + i.id;}}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId'}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/bar', '#c/123/bar'])},
        {key: 'c/123/bar', value: getFixturePhone(2)}],
      fetch: getFixtureCustomer([getFixturePhone(2), getFixturePhone(2)])},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {id: '@parentId', subId: '@id'}}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/789/bar/12', '#c/789/bar/34'])},
        {key: 'c/789/bar/12', value: getFixturePhone(1)},
        {key: 'c/789/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}}, 'phones.country': {key: 'c/:id/baz/:subSubId', params: {subSubId: '@id'}}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#c/123/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#c/123/baz/fr')},
        {key: 'c/123/baz/fr', value: fixtureCountry}],
      fetch: fixtureCustomer},
    {config: {$cache: {key: 'c/:id', split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}, split: {country: {key: 'c/:id/bar/:subId/baz/:subSubId', params: {subSubId: '@id'}}}}}}},
      store: [
        {key: 'c/123', value: getFixtureCustomer(['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#c/123/bar/12/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#c/123/bar/34/baz/fr')},
        {key: 'c/123/bar/12/baz/fr', value: fixtureCountry},
        {key: 'c/123/bar/34/baz/fr', value: fixtureCountry}],
      fetch: fixtureCustomer},
  ];

  angular.forEach(dataprovider, function(data) {
    var config = data.config,
        store = data.store,
        fetch = data.fetch;
    describe('calling a action with config ' + JSON.stringify(config), function() {
      var resource, $window;
      beforeEach(function() {
        inject(function($injector) {
          $window = $injector.get('$window');
          $window.localStorage.clear();

          angular.forEach(store, function(expectation) {
            $window.localStorage[expectation.key] = JSON.stringify([new Date().getTime(), expectation.value]);
          });

          Customer = $injector.get('$cResource')('/customers/:id', {id: '@id'}, {
            get: angular.extend({}, {method: 'GET'}, config)
          });
        });

        resource = Customer.get({id: 123});
      });

      var cleanUp = function(data) {
        delete data.$cache;
        delete data.$promise;
        delete data.$resolved;

        if (angular.isObject(data) || angular.isArray(data)) {
          angular.forEach(data, function(item) {
            cleanUp(item);
          });
        }
      };

      it('should retreives a customer', function() {
        cleanUp(resource);
        expect(JSON.stringify(resource)).toEqual(JSON.stringify(fetch));
      });
    });
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

      it('should store "' + JSON.stringify(store) + '"', function() {
        angular.forEach(store, function(expectation) {
          expect($window.localStorage[expectation.key]).toBeDefined();
          expect(JSON.parse($window.localStorage[expectation.key])[1]).toEqual(expectation.value);
        });
        expect($window.localStorage.length).toBe(store.length);
      });
    });
  });
});
