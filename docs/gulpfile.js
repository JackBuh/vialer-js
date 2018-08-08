const childExec = require('child_process').exec
const path = require('path')

const ghPages = require('gulp-gh-pages')
const gulp = require('gulp-help')(require('gulp'), {})
const gutil = require('gulp-util')
const livereload = require('gulp-livereload')

let settings = require('../tasks/settings')

gulp.task('code', 'Generate code documentation json.', (done) => {
    let execCommand = `node ${settings.NODE_PATH}/jsdoc/jsdoc.js ${settings.BASE_DIR}src -c ${settings.BASE_DIR}.jsdoc.json -d ${settings.BUILD_DIR}/docs`
    childExec(execCommand, undefined, (err, stdout, stderr) => {
        if (stderr) gutil.log(stderr)
        if (stdout) gutil.log(stdout)
        if (settings.LIVERELOAD) livereload.changed('rtd.js')
        done()
    })
})


gulp.task('publish', 'Publish jsdoc documentation to Github pages.', ['docs'], () => {
    return gulp.src(path.join(settings.BUILD_DIR, 'docs', '**', '*')).pipe(ghPages())
})


gulp.task('screenshots', 'Generate in-app screenshots for jsdoc documentation.', (done) => {

})
