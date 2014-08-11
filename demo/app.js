'use strict';

angular.module('app', ['exResource'])
  .controller('foo', function($scope, $window, $xResourceConfig, Customer, User) {
    $scope.user = User.get({id: 123});
    $scope.user.$promise.then(function(user) {
      $xResourceConfig.prefix = 'u/' + user.id + '/';
      $scope.customer2 = Customer.get({id: 2});
      $scope.customer5 = Customer.get({id: 5});
      $scope.customers = Customer.query();
    });
    $scope.localStorage = $window.localStorage;
  })
  .factory('Customer', function($xResource) {
    return $xResource('./fixtures/customers/:id.json', {id: '@id'}, {
      get: {method:'GET', $accessProperty: 'customer', $cache:{
        key: 'customer/:id',
        split: {
          'addresses': {
            key: 'customer/:id/address/:addressId',
            params: {'addressId': '@id'}
          },
          'addresses.country': {
            key: 'country/:code',
            params: {'code': '@code'}
          },
        }
      }},
      query: {method:'GET', isArray: true, $accessProperty: 'customers', $cache:{
        key: 'customers',
        split: {
          '': {
            key: 'customer/:id',
            split: {
              'addresses': {
                key: 'customer/:id/address/:addressId',
                params: {'addressId': '@id'}
              },
              'addresses.country': {
                key: 'country/:code',
                params: {'code': '@code'}
              }
            }
          }
        }
      }},
    });
  })
  .factory('User', function($xResource) {
    return $xResource('./fixtures/users/:id.json', {id: '@id'}, {
      get: {method: 'GET', $accessProperty: 'user'}
    });
  });