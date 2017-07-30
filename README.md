Sma plugin for [Gulp](https://github.com/Hedgefog/gulp-sma).

# Install

```
npm install gulp-sma --save-dev
```

# Basic Usage

```javascript
var gulp = require('gulp');
var gulpSma = require('gulp-sma');

gulp.task('sma', () => {
  return gulp.src('./src/scripts/**/*.sma')
    .pipe(gulpSma({
        compiler: path.join(__dirname, './compiler/amxxpc'),
        dest: path.join(__dirname, './dist/addons/amxmodx/plugins'),
        includeDir: path.join(__dirname, './src/include'),
    }))
    .pipe(gulp.dest('./dist/addons/amxmodx/scripting'))
});

gulp.task('sma:watch', ['build:plugins'], () => {
  gulp.watch('./src/scripts/**/*.sma', ['sma']);
});
```