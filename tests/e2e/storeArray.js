'use strict';

describe('A service using $cResource', function() {
  var Customer;
  beforeEach(function() {
    module('cResource');
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
      result:[]},

    // simple alias
    {config: {$cache: true},
      result:[
        {key: '/customers', value: fixtureCustomers}]},
    {config: {$cache: false},
      result:[]},
    {config: {$cache: 'foo/:id'},
      result:[
        {key: 'foo', value: fixtureCustomers}]},
    {config: {$cache: function(p) {return 'foo/' + p.id;}},
      result:[
        {key: 'foo/undefined', value: fixtureCustomers}]},

    // simple object
    {config: {$cache: {key: true}},
      result:[
        {key: '/customers', value: fixtureCustomers}]},
    {config: {$cache: {key: false}},
      result:[]},
    {config: {$cache: {key: 'foo/:id'}},
      result:[
        {key: 'foo', value: fixtureCustomers}]},
    {config: {$cache: {key: function(p) {return 'foo/' + p.id;}}},
      result:[
        {key: 'foo/undefined', value: fixtureCustomers}]},

    // params
    {config: {$cache: {key: 'c/:name'}},
      result: [
        {key: 'c', value: fixtureCustomers}]},
    {config: {$cache: {key: 'c/:name', params: {name: '@name'}}},
      result: [
        {key: 'c', value: fixtureCustomers}]},
    {config: {$cache: {key: 'c/:name', params: {name: 'bar'}}},
      result: [
        {key: 'c/bar', value: fixtureCustomers}]},
    {config: {$cache: {key: 'c/:name', params: {name: function() {return 'baz';}}}},
      result: [
        {key: 'c/baz', value: fixtureCustomers}]},

    // split
    {config: {$cache: {key: 'c/:id', split: {'': {key: true}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1)},
        {key: 'c/456', value: getFixtureCustomer(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: false}}}},
      result: [
        {key: 'c', value: []}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split:{phones: {key: true}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123//phones', '#c/123//phones'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456//phones', '#c/456//phones'])},
        {key: 'c/123//phones', value: getFixturePhone(2)},
        {key: 'c/456//phones', value: getFixturePhone(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: false}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, [])},
        {key: 'c/456', value: getFixtureCustomer(2, [])}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: function(p, i) {return 'c/' + p.id + '/bar/' + i.id;}}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456/bar/12', '#c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)},
        {key: 'c/456/bar/12', value: getFixturePhone(1)},
        {key: 'c/456/bar/34', value: getFixturePhone(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: 'c/:id/bar/:subId'}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123/bar', '#c/123/bar'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456/bar', '#c/456/bar'])},
        {key: 'c/123/bar', value: getFixturePhone(2)},
        {key: 'c/456/bar', value: getFixturePhone(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456/bar/12', '#c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1)},
        {key: 'c/123/bar/34', value: getFixturePhone(2)},
        {key: 'c/456/bar/12', value: getFixturePhone(1)},
        {key: 'c/456/bar/34', value: getFixturePhone(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: 'c/:id/bar/:subId', params: {id: '@parentId', subId: '@id'}}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/789/bar/12', '#c/789/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/789/bar/12', '#c/789/bar/34'])},
        {key: 'c/789/bar/12', value: getFixturePhone(1)},
        {key: 'c/789/bar/34', value: getFixturePhone(2)}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}}, 'phones.country': {key: 'c/:id/baz/:subSubId', params: {subSubId: '@id'}}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456/bar/12', '#c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#c/123/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#c/123/baz/fr')},
        {key: 'c/456/bar/12', value: getFixturePhone(1, '#c/456/baz/fr')},
        {key: 'c/456/bar/34', value: getFixturePhone(2, '#c/456/baz/fr')},
        {key: 'c/123/baz/fr', value: fixtureCountry},
        {key: 'c/456/baz/fr', value: fixtureCountry}]},
    {config: {$cache: {key: 'c/:id', split: {'': {key: true, split: {phones: {key: 'c/:id/bar/:subId', params: {subId: '@id'}, split: {country: {key: 'c/:id/bar/:subId/baz/:subSubId', params: {subSubId: '@id'}}}}}}}}},
      result: [
        {key: 'c', value: ['#c/123', '#c/456']},
        {key: 'c/123', value: getFixtureCustomer(1, ['#c/123/bar/12', '#c/123/bar/34'])},
        {key: 'c/456', value: getFixtureCustomer(2, ['#c/456/bar/12', '#c/456/bar/34'])},
        {key: 'c/123/bar/12', value: getFixturePhone(1, '#c/123/bar/12/baz/fr')},
        {key: 'c/123/bar/34', value: getFixturePhone(2, '#c/123/bar/34/baz/fr')},
        {key: 'c/456/bar/12', value: getFixturePhone(1, '#c/456/bar/12/baz/fr')},
        {key: 'c/456/bar/34', value: getFixturePhone(2, '#c/456/bar/34/baz/fr')},
        {key: 'c/123/bar/12/baz/fr', value: fixtureCountry},
        {key: 'c/123/bar/34/baz/fr', value: fixtureCountry},
        {key: 'c/456/bar/12/baz/fr', value: fixtureCountry},
        {key: 'c/456/bar/34/baz/fr', value: fixtureCountry}]},
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
          $httpBackend.when('GET', '/customers')
            .respond(fixtureCustomers);

          Customer = $injector.get('$cResource')('/customers/:id', {id: '@id'}, {
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
