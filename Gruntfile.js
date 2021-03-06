module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        //sourceMap: 'public/js/min/seekanddestroy.min.map'
      },
      files: {
        src: 'public/js/main.js',
        dest: 'public/js/min/<%= pkg.name %>-<%= pkg.version %>.min.js'
      }
    },
    jshint: {
      options: {
        undef: true, //no undefined variable (except for ignores) allowed
        unused: 'vars', //no unused vars allowed
        eqeqeq: true, //must always use ===
        //strict: true,
        forin: true,
        curly: true,
        latedef: 'nofunc',
        quotmark: 'single',
        browser: true,
        jquery: true,
        nonstandard: true,
        devel: true,
        globals: {
          //SAD globals
          Sad: true,
          SockServer: true,
          ClassServer: true,
          RPiServer: true,
          //library globals
          '_': true,
          Backbone: true,
          io: true
        }
      },
      files: {
        src: ['public/js/*.js', '!public/js/min/*.js', '!public/js/sockets.js']
      }
    },
    less: {
      options: {
        cleancss: true,
        ieCompat: true
      },
      files: {
        src: 'public/css/less/main.less',
        dest: 'public/css/main.min.css'
      }
    },
    watch: {
      css: {
        files: 'public/**/*.less',
        tasks: ['less']
      },
      jshint: {
        files: ['public/js/*.js', 'public/!js/min/*.js', '!public/js/sockets.js'],
        tasks: ['jshint', 'uglify']
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  //grunt.registerTask('default', ['uglify', 'jshint', 'less']);
  grunt.registerTask('default', ['watch']);
};