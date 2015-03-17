'use strict';

describe('A service using $xResource to cache Array', function() {
  var Customer;
  beforeEach(function() {
    module('exResource');
  });

  var getFixtureCustomer = function(template, phones) {
    var templates = {
      1: {
        id: 123,
        name: 'foo',
      },
      2: {
        id: 456,
        name: 'bar',
      },
    };
    return angular.extend({}, templates[template], {phones: angular.isUndefined(phones) ? [getFixturePhone(1), getFixturePhone(2  )] : phones});
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
  var fixtureCustomers = [
    getFixtureCustomer(1),
    getFixtureCustomer(2)
  ];

  var dataprovider = [
    {config: {},
      store: [],
      fetch: []},

    // simple alias
    {config: {$cache: true},
      store: [
        {key: '/customers', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: false},
      store: [],
      fetch: []},
    {config: {$cache: 'foo/:id'},
      store: [
        {key: 'foo', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: function(p) {return 'foo/' + p.id;}},
      store: [
        {key: 'foo/undefined', value: fixtureCustomers}],
      fetch: fixtureCustomers},

    // simple object
    {config: {$cache: {key: true}},
      store: [
        {key: '/customers', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: false}},
      store: [],
      fetch: []},
    {config: {$cache: {key: 'foo/:id'}},
      store: [
        {key: 'foo', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: function(p) {return 'foo/' + p.id;}}},
      store: [
        {key: 'foo/undefined', value: fixtureCustomers}],
      fetch: fixtureCustomers},

    // params
    {config: {$cache: {key: 'c/:name'}},
      store: [
        {key: 'c', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:name', params: {name: '@name'}}},
      store: [
        {key: 'c', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:name', params: {name: 'bar'}}},
      store: [
        {key: 'c/bar', value: fixtureCustomers}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:name', params: {name: function() {return 'baz';}}}},
      store: [
        {key: 'c/baz', value: fixtureCustomers}],
      fetch: fixtureCustomers},

    // split
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1)},
        {key: 'c/456', value: getFixtureCustomer(2)}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: false}}}},
      store: [
        {key: 'c', value: [null, null]}],
      fetch: [null, null]},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split:{'phones.*': {key: true}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123//phones', '#$c/123//phones'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456//phones', '#$c/456//phones'])},
        {key: 'c/123//phones', value: getFixturePhone(2)},
        {key: 'c/456//phones', value: getFixturePhone(2)}],
      fetch: [getFixtureCustomer(1, [getFixturePhone(2), getFixturePhone(2)]), getFixtureCustomer(2, [getFixturePhone(2), getFixturePhone(2)])]},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: false}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, [null, null])},
        {key: 'c/456', value: getFixtureCustomer(2, [null, null])}],
      fetch: [getFixtureCustomer(1, [null, null]), getFixtureCustomer(2, [null, null])]},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: function(p, i) {return 'c/' + p.id + '/bar/' + i.id;}}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123/bar/12', '#$c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456/bar/12', '#$c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)},
        {key: 'c/456/bar/12', value: getFixturePhone(1)},
        {key: 'c/456/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: 'c/:id/bar/:subId'}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123/bar', '#$c/123/bar'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456/bar', '#$c/456/bar'])},
        {key: 'c/123/bar', value: getFixturePhone(2)},
        {key: 'c/456/bar', value: getFixturePhone(2)}],
      fetch: [getFixtureCustomer(1, [getFixturePhone(2), getFixturePhone(2)]), getFixtureCustomer(2, [getFixturePhone(2), getFixturePhone(2)])]},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: 'c/:id/bar/:subId', params: {subId: '@id'}}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123/bar/12', '#$c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456/bar/12', '#$c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)},
        {key: 'c/456/bar/12', value: getFixturePhone(1)},
        {key: 'c/456/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: 'c/:id/bar/:subId', params: {id: '@parentId', subId: '@id'}}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/789/bar/12', '#$c/789/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/789/bar/12', '#$c/789/bar/34'])},
        {key: 'c/789/bar/12', value: getFixturePhone(1)},
        {key: 'c/789/bar/34', value: getFixturePhone(2)}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: 'c/:id/bar/:subId', params: {subId: '@id'}}, 'phones.*.country': {key: 'c/:id/baz/:subSubId', params: {subSubId: '@id'}}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123/bar/12', '#$c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456/bar/12', '#$c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#$c/123/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#$c/123/baz/fr')},
        {key: 'c/456/bar/12', value: getFixturePhone(1, '#$c/456/baz/fr')},
        {key: 'c/456/bar/34', value: getFixturePhone(2, '#$c/456/baz/fr')},
        {key: 'c/123/baz/fr', value: fixtureCountry},
        {key: 'c/456/baz/fr', value: fixtureCountry}],
      fetch: fixtureCustomers},
    {config: {$cache: {key: 'c/:id', split: {'*': {key: true, split: {'phones.*': {key: 'c/:id/bar/:subId', params: {subId: '@id'}, split: {country: {key: 'c/:id/bar/:subId/baz/:subSubId', params: {subSubId: '@id'}}}}}}}}},
      store: [
        {key: 'c', value: ['#$c/123', '#$c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#$c/123/bar/12', '#$c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#$c/456/bar/12', '#$c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#$c/123/bar/12/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#$c/123/bar/34/baz/fr')},
        {key: 'c/456/bar/12', value: getFixturePhone(1, '#$c/456/bar/12/baz/fr')},
        {key: 'c/456/bar/34', value: getFixturePhone(2, '#$c/456/bar/34/baz/fr')},
        {key: 'c/123/bar/12/baz/fr', value: fixtureCountry},
        {key: 'c/123/bar/34/baz/fr', value: fixtureCountry},
        {key: 'c/456/bar/12/baz/fr', value: fixtureCountry},
        {key: 'c/456/bar/34/baz/fr', value: fixtureCountry}],
      fetch: fixtureCustomers},
  ];

  angular.forEach(dataprovider, function(data) {
    var config = data.config,
        store = data.store,
        fetch = data.fetch;
    describe('calling a action with config ' + JSON.stringify(config), function() {
      var resource, $localForage;
      beforeEach(function() {
        inject(function($injector) {
          $localForage = $injector.get('$localForage');
          $localForage.clear();

          angular.forEach(store, function(expectation) {
            $localForage.setItem(expectation.key, [new Date().getTime(), expectation.value]);
          });

          Customer = $injector.get('$xResource')('/customers/:id', {id: '@id'}, {
            query: angular.extend({}, {method: 'GET', isArray: true}, config)
          });
        });

        resource = Customer.query();
      });

      var cleanUp = function(data) {
        if (data) {
          delete data.$cache;
          delete data.$promise;
          delete data.$cachePromise;
          delete data.$resolved;
        }

        if (angular.isObject(data) || angular.isArray(data)) {
          angular.forEach(data, function(item) {
            cleanUp(item);
          });
        }
      };

      it('should retreives a customer', function() {
        if (angular.isDefined(resource.$cachePromise)) {
          resource.$cachePromise.then(function() {
            cleanUp(resource);
            expect(JSON.stringify(resource)).toEqual(JSON.stringify(fetch));
          });
        } else {
          cleanUp(resource);
          expect(JSON.stringify(resource)).toEqual(JSON.stringify(fetch));
        }
      });
    });
    describe('calling a action with config ' + JSON.stringify(config), function() {
      var resource, $httpBackend, $localForage;
      beforeEach(function() {
        inject(function($injector) {
          $localForage = $injector.get('$localForage');
          $localForage.clear();
          $httpBackend = $injector.get('$httpBackend');
          $httpBackend.when('GET', '/customers')
            .respond(fixtureCustomers);

          Customer = $injector.get('$xResource')('/customers/:id', {id: '@id'}, {
            query: angular.extend({}, {method: 'GET', isArray: true}, config)
          });
        });
        resource = Customer.query();
        $httpBackend.flush();
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      describe('when API respond', function() {
        it('should store "' + JSON.stringify(store) + '"', function() {
          angular.forEach(store, function(expectation) {
            $localForage.getItem(expectation.key).then(function (value) {
              expect(value).toBeDefined();
              expect(value[1]).toEqual(expectation.value);
            });
          });
        });
      });
    });
  });
});
