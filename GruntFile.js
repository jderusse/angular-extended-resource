'use strict';

module.exports = function(grunt) {
  var srcFiles = './src/**/*.js';
  var conf = {
    dest: './dist'
  };

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),
    conf: conf,

    uglify: {
      original: {
        options: {mangle: false, compress: false, beautify: true},
        files: [
          {
            src: srcFiles,
            dest: '<%= conf.dest %>/angular-extended-resource.js'
          }
        ]
      },
      minimized: {
        options: {mangle: true, compress: true, beautify: false},
        files: [
          {
            src: srcFiles,
            dest: '<%= conf.dest %>/angular-extended-resource.min.js'
          }
        ]
      }
    },

    karma: {
      unit: {
        configFile: 'tests/karma.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },


    coveralls: {
      options: {
        debug: true,
        coverage_dir: 'coverage',
        force: true,
        recursive: true
      }
    },


    copy: {
      build: {
        src: [
          './README.md',
          './LICENSE',
          './bower.json',
        ],
        dest: '<%= conf.dest %>/',
        expand: true,
        flatten: true,
        cwd: ''
      },
    },


    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      uses_defaults: ['Gruntfile.js', './src/**/*.js']
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-karma-coveralls');
  
  grunt.registerTask('dist', ['jshint', 'copy', 'uglify:original', 'uglify:minimized']);
  grunt.registerTask('test', ['karma']);
  grunt.registerTask('travis', ['test', 'coveralls']);

  grunt.registerTask('default', ['dist']);
};