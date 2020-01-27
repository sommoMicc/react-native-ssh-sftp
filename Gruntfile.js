const loadGruntTasks = require("load-grunt-tasks");
const {readFileSync} = require("fs");

const BUILD_DIR = "lib";

module.exports = grunt => {
  loadGruntTasks(grunt);
  grunt.initConfig({
    clean: {
      build: [
        BUILD_DIR,
        "tsconfig.tsbuildinfo",
      ],
    },
    run: {
      build: {
        cmd: "npx",
        args: [
          "tsc",
        ],
      },
    },
  });

  grunt.registerTask(
    "build",
    "Build the library for release",
    [
      "run:build",
    ]
  );

  grunt.registerTask(
    "default",
    "build"
  );
};
