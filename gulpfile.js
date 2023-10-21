"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const { watch } = require("gulp");

gulp.task("sass", (cb) => {
    gulp.src("./templates/animaprime.scss").pipe(sass().on("error", sass.logError)).pipe(gulp.dest("./"));
    cb();
});

gulp.task("default", (cb) => {
    gulp.src("./templates/animaprime.scss").pipe(sass().on("error", sass.logError)).pipe(gulp.dest("./"));
    gulp.watch("./templates/**/*.scss", gulp.series("sass"));
    cb();
});
