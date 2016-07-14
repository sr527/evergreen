module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        babel: {
          options: {
            sourceMap: true,
            presets:  ['es2015']
          },
          dist: {
            files: {
              'static/js/waterfall.js':'static/js/waterfall.jsx'
            }
          } 

        },

        jsx: {
          waterfall: {
            src: 'static/js/waterfall.jsx',
            dest: 'static/js/waterfall.js'
          }
        },
        
        react: {
          single_file_output: {
            files: {
              'static/js/waterfall.js':'static/js/waterfall.jsx'
            }
          }
        },

        watch: {
          cssthings: {
            files: ['static/less/**'],
            tasks: ['css']
          }
      /*    reactthings: {
            files: ['static/js/waterfall.js'],
            tasks: ['react']
          }
    */    },

        watchjsx: {
            files: ['static/js/waterfall.jsx'],
            tasks: ['react']
        },

        less: {
            main: {
                options: {
                    paths: ['static/less'],
                    sourceMap: true,
                    sourceMapFilename: 'static/dist/less.map',
                    sourceMapURL: '/static/dist/less.map',
                    sourceMapRootpath: '../../'
                },
                files: {
                    'static/dist/css/styles.css': 'static/less/main.less'
                }
            }
        },

        cssmin: {
            combine: {
                files: {
                    'static/dist/css/styles.min.css': 'static/dist/css/styles.css'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-react');

    grunt.registerTask('css', ['less', 'cssmin']);

    grunt.registerTask('default', ['css']);
    grunt.registerTask('babel1', ['babel']);

    grunt.registerTask('jsxcompile', ['react']);
};
