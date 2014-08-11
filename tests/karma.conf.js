'use strict';

// Karma configuration
// Generated on Mon Jun 09 2014 16:21:40 GMT+0000 (UTC)

module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'components/angular/angular.js',
      'components/angular-mocks/angular-mocks.js',
      'components/angular-resource/angular-resource.js',
      'src/angular-extended-resource.js',
      'tests/e2e/**/*.js',
    ],
    exclude: [],
    preprocessors: {},
    reporters: ['progress'],
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: true
  });
};
