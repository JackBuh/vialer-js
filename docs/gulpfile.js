const childExec = require('child_process').exec
const path = require('path')

const flatten = require('gulp-flatten')
const ghPages = require('gulp-gh-pages')
const gulp = require('gulp-help')(require('gulp'), {})
const gutil = require('gulp-util')
const ifElse = require('gulp-if-else')
const livereload = require('gulp-livereload')
const runSequence = require('run-sequence')
const template = require('gulp-template')

const Helpers = require('../tools/helpers')

// Force the build target here, so we can keep the gulp helpers generic.
let settings = require('../tools/settings')(__dirname, {
    BUILD_TARGET: 'docs',
})

const helpers = new Helpers(settings)


gulp.task('build', 'Generate documentation website.', (done) => {
    runSequence([
        // 'code',
        'html',
        'js-app',
        'js-vendor',
        // 'screenshots',
        'scss-app',
        'scss-vendor',
        'templates',
    ], () => {done()})
})

gulp.task('code', 'Generate code documentation as JSON.', (done) => {
    const commandPart1 = `node ${settings.NODE_PATH}/jsdoc/jsdoc.js ${settings.ROOT_DIR}src`
    const commandPart2 = `-c ${settings.ROOT_DIR}.jsdoc.json -d ${settings.BUILD_DIR}/docs`
    const command = `${commandPart1}${commandPart2}`
    childExec(command, undefined, (err, stdout, stderr) => {
        if (stderr) gutil.log(stderr)
        if (stdout) gutil.log(stdout)
        if (settings.LIVERELOAD) livereload.changed('rtd.js')
        done()
    })
})


gulp.task('html', 'Generate HTML index file.', () => {
    // The index.html file is shared with the electron build target.
    // Appropriate scripts are inserted based on the build target.
    return gulp.src(path.join('src', 'index.html'))
        .pipe(template({settings}))
        .pipe(flatten())
        .pipe(gulp.dest(path.join(settings.BUILD_DIR)))
        .pipe(ifElse(settings.LIVERELOAD, livereload))
})


gulp.task('js-app', 'Generate app JavaScript.', (done) => {
    helpers.jsEntry('./src/js/index.js', 'app').then(() => {
        if (settings.LIVERELOAD) livereload.changed('app.js')
        done()
    })
})


gulp.task('js-vendor', 'Generate vendor JavaScript.', [], (done) => {
    helpers.jsEntry('./src/js/vendor.js', 'vendor').then(() => {
        if (settings.LIVERELOAD) livereload.changed('docs.js')
        done()
    })
})


gulp.task('publish', 'Publish documentation to Github pages.', ['docs'], () => {
    return gulp.src(path.join(settings.BUILD_DIR, '**', '*')).pipe(ghPages())
})


gulp.task('screenshots', 'Generate userstory screenshots.', (done) => {

})


gulp.task('scss-app', 'Generate documentation CSS.', (done) => {
    const entryExtra = [path.join(settings.SRC_DIR, 'components', '**', '*.scss')]
    return helpers.scssEntry(path.join(settings.SRC_DIR, 'scss', 'app.scss'), !settings.PRODUCTION, entryExtra)
})


gulp.task('scss-vendor', 'Generate vendor CSS.', () => {
    return helpers.scssEntry('./src/scss/vendor.scss', false)
})


gulp.task('templates', 'Generate Vue component templates.', () => {
    return helpers.compileTemplates('./src/components/**/*.vue')
})


gulp.task('watch', 'Run developer watch modus.', () => {
    helpers.startDevService()
    gulp.watch(path.join(settings.SRC_DIR, 'index.html'), ['html'])
    gulp.watch([
        path.join(settings.SRC_DIR, 'components', '**', '*.scss'),
        path.join(settings.SRC_DIR, 'scss', '**', '*.scss'),
        `!${path.join(settings.SRC_DIR, 'scss', 'vendor.scss')}`,
    ], ['scss-app'])

    gulp.watch([
        // Also watch for changes from Vialer-js App framework.
        path.join(settings.ROOT_DIR, 'src', 'js', '**', '*.js'),
        path.join(settings.SRC_DIR, 'components', '**', '*.js'),
        path.join(settings.SRC_DIR, 'js', '**', '*.js'),
        `!${path.join(settings.SRC_DIR, 'js', 'vendor.js')}`,
    ], ['js-app'])

    gulp.watch([path.join(settings.SRC_DIR, 'js', 'vendor.js')], ['js-vendor'])
    gulp.watch(path.join(settings.SRC_DIR, 'scss', 'vendor.scss'), ['scss-vendor'])
    gulp.watch([path.join(settings.SRC_DIR, 'components', '**', '*.vue')], ['templates'])
})
