'use strict';

angular.module('app', ['exResource'])
  .controller('demo', function($scope, $window, $xResourceConfig, Customer, User) {
    $scope.user = User.get({id: 123});
    $scope.user.$promise.then(function(user) {
      $xResourceConfig.prefix = 'u/' + user.id + '/';
      $scope.customers = Customer.query();
      $scope.customer2 = Customer.get({id: 2});
      $scope.customer5 = Customer.get({id: 5});
      $scope.customer6 = Customer.get({id: 6});
    });
    $scope.localStorage = $window.localStorage;
  })
  .factory('Customer', function($xResource) {
    var cacheConfig = {
      key: 'customer/:id',
      split: {
        'addresses.*': {
          key: 'customer/:id/address/:addressId',
          params: {'addressId': '@id'}
        },
        'addresses.*.country': {
          key: 'country/:code',
          params: {'code': '@code'}
        },
      }
    };
    return $xResource('./fixtures/customers/:id.json', {id: '@id'}, {
      get: {method:'GET', $accessProperty: 'customer', $cache: cacheConfig},
      query: {method:'GET', isArray: true, $accessProperty: 'customers', $cache:{key: 'customers', split: {'*': cacheConfig}}}
    });
  })
  .factory('User', function($xResource) {
    return $xResource('./fixtures/users/:id.json', {id: '@id'}, {
      get: {method: 'GET', $accessProperty: 'user'}
    });
  });