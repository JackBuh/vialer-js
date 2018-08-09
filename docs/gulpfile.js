const childExec = require('child_process').exec
const path = require('path')

const flatten = require('gulp-flatten')
const ghPages = require('gulp-gh-pages')
const gulp = require('gulp-help')(require('gulp'), {})
const gutil = require('gulp-util')
const ifElse = require('gulp-if-else')
const livereload = require('gulp-livereload')
const template = require('gulp-template')

const Helpers = require('../tasks/helpers')
let settings = require('../tasks/settings')
const helpers = new Helpers(settings)


gulp.task('code', 'Generate code documentation json.', (done) => {
    let execCommand = `node ${settings.NODE_PATH}/jsdoc/jsdoc.js ${settings.BASE_DIR}src -c ${settings.BASE_DIR}.jsdoc.json -d ${settings.BUILD_DIR}/docs`
    childExec(execCommand, undefined, (err, stdout, stderr) => {
        if (stderr) gutil.log(stderr)
        if (stdout) gutil.log(stdout)
        if (settings.LIVERELOAD) livereload.changed('rtd.js')
        done()
    })
})


gulp.task('html', 'Preprocess and build application HTML.', () => {
    // The index.html file is shared with the electron build target.
    // Appropriate scripts are inserted based on the build target.
    return gulp.src(path.join('src', 'index.html'))
        .pipe(template({settings}))
        .pipe(flatten())
        .pipe(gulp.dest(path.join(settings.BUILD_DIR, settings.BRAND_TARGET, 'docs')))
        .pipe(ifElse(settings.LIVERELOAD, livereload))
})


gulp.task('publish', 'Publish jsdoc documentation to Github pages.', ['docs'], () => {
    return gulp.src(path.join(settings.BUILD_DIR, 'docs', '**', '*')).pipe(ghPages())
})


gulp.task('screenshots', 'Generate in-app screenshots for jsdoc documentation.', (done) => {

})


gulp.task('watch', 'Start development server, watch files for changes and auto-rebuild.', () => {
    helpers.startDevServer(8666)

    gulp.watch(path.join(__dirname, 'src', 'index.html'), ['html'])
})
