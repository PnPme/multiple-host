const gulp = require('gulp');
const less = require('gulp-less');
const minifyCSS = require('gulp-csso');
const watch = require('gulp-watch');

const cssPath = 'src/*.less';

gulp.task('css-watch', function () {
    return watch(cssPath, function () {
        gulp.src(cssPath)
            .pipe(less())
            .pipe(minifyCSS())
            .pipe(gulp.dest('pages/main'))
    });
});

gulp.task('css', function () {
    return gulp.src(cssPath)
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(gulp.dest('pages/main'))
});

gulp.task('watch', ['css-watch']);

gulp.task('default', ['css']);
