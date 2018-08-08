/**
* The Gulp buildsystem takes care of executing all tasks like bundling
* JavaScript, automated deployment to stores, transpiling SCSS, minifying,
* concatting, copying assets, etc...
*/
const {_extend, promisify} = require('util')
const archiver = require('archiver')
const fs = require('fs')
const path = require('path')

const addsrc = require('gulp-add-src')
const argv = require('yargs').argv
const childExec = require('child_process').exec
const colorize = require('tap-colorize')
const composer = require('gulp-uglify/composer')
const concat = require('gulp-concat')
const del = require('del')
const flatten = require('gulp-flatten')

const fuet = require('gulp-fuet')
const gulp = require('gulp-help')(require('gulp'), {})
const gutil = require('gulp-util')
const Helpers = require('./tasks/helpers')
const livereload = require('gulp-livereload')
const ifElse = require('gulp-if-else')
const insert = require('gulp-insert')
const imagemin = require('gulp-imagemin')
const minifier = composer(require('uglify-es'), console)
const mkdirp = promisify(require('mkdirp'))
const notify = require('gulp-notify')

const runSequence = require('run-sequence')
const size = require('gulp-size')
const svgo = require('gulp-svgo')
const tape = require('gulp-tape')
const template = require('gulp-template')
const test = require('tape')

const writeFileAsync = promisify(fs.writeFile)

// The main settings object containing info from .vialer-jsrc and build flags.
let settings = require('./tasks/settings')

// Initialize the helpers, which make this file less dense.
const helpers = new Helpers(settings)
const WATCHTEST = argv.verify ? true : false


// Notify developer about some essential build flag values.
gutil.log('BUILD FLAGS:')
gutil.log(`- BRAND: ${settings.BRAND_TARGET}`)
gutil.log(`- DEPLOY: ${settings.DEPLOY_TARGET}`)
gutil.log(`- PRODUCTION: ${settings.PRODUCTION}`)
gutil.log(`- TARGET: ${settings.BUILD_TARGET}`)
gutil.log(`- VERBOSE: ${settings.VERBOSE}`)


gulp.task('assets', 'Copy (branded) assets to the build directory.', () => {
    const robotoPath = path.join(settings.NODE_PATH, 'roboto-fontface', 'fonts', 'roboto')
    return gulp.src(path.join(robotoPath, '{Roboto-Light.woff2,Roboto-Regular.woff2,Roboto-Medium.woff2}'))
        .pipe(flatten({newPath: './fonts'}))
        .pipe(addsrc(`./src/brand/${settings.BRAND_TARGET}/img/{*.icns,*.png,*.jpg,*.gif}`, {base: `./src/brand/${settings.BRAND_TARGET}/`}))
        .pipe(addsrc(`./src/brand/${settings.BRAND_TARGET}/ringtones/*`, {base: `./src/brand/${settings.BRAND_TARGET}/`}))
        .pipe(ifElse(settings.PRODUCTION, imagemin))
        .pipe(ifElse(settings.BUILD_TARGET === 'electron', () => addsrc('./package.json')))
        .pipe(addsrc('./LICENSE'))
        .pipe(addsrc('./README.md'))
        .pipe(addsrc('./src/_locales/**', {base: './src/'}))
        .pipe(gulp.dest(`./build/${settings.BRAND_TARGET}/${settings.BUILD_TARGET}`))
        .pipe(size(_extend({title: 'assets'}, settings.SIZE_OPTIONS)))
        .pipe(ifElse(settings.LIVERELOAD, livereload))
})


gulp.task('build', 'Build vialer-js as <brand> to <target> platform.', (done) => {
    // Refresh the brand content with each build.
    if (settings.BUILD_TARGET === 'docs') {
        runSequence(['docs'], done)
        return
    }
    let mainTasks = [
        'assets', 'templates', 'i18n', 'html', 'scss', 'scss-vendor',
        'js-vendor', 'js-app-bg', 'js-app-fg', 'js-app-modules',
    ]

    if (settings.BUILD_TARGET === 'electron') {
        runSequence(mainTasks, () => {done()})
    } else if (settings.BUILD_TARGET === 'webview') {
        runSequence(mainTasks, () => {done()})
    } else if (['chrome', 'firefox'].includes(settings.BUILD_TARGET)) {
        runSequence(mainTasks, ['js-app-observer', 'manifest'], () => {done()})
    }
})


gulp.task('build-clean', 'Clear the build directory', async() => {
    await del([path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET, '**')], {force: true})
    await mkdirp(path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET))
})


gulp.task('build-dist', 'Make an optimized build suitable for distribution.', ['build'], (done) => {
    const buildDir = path.join(__dirname, 'build', settings.BRAND_TARGET, settings.BUILD_TARGET)
    const distDir = path.join(__dirname, 'dist', settings.BRAND_TARGET)
    mkdirp(distDir).then(() => {
        let distName = helpers.distributionName(settings.BRAND_TARGET)
        // Not using Gulp's Vinyl-based zip, because of a symlink issue that prevents
        // the MacOS build to be zipped properly. See https://github.com/gulpjs/gulp/issues/1427
        const output = fs.createWriteStream(path.join(distDir, distName))
        const archive = archiver('zip', {zlib: {level: 6}})

        output.on('close', function() {
            gutil.log(archive.pointer() + ' total bytes archived')
            done()
        })

        archive.pipe(output)

        if (['chrome', 'firefox'].includes(settings.BUILD_TARGET)) {
            archive.directory(buildDir, false)
            archive.finalize()
        } else if (settings.BUILD_TARGET === 'electron') {
            const iconParam = `--icon=${buildDir}/img/electron-icon.png`
            let buildParams = `--arch=${settings.BUILD_ARCH} --asar --overwrite --platform=${settings.BUILD_PLATFORM} --prune=true`
            // This is broken when used in combination with Wine due to rcedit.
            // See: https://github.com/electron-userland/electron-packager/issues/769
            if (settings.BUILD_PLATFORM !== 'win32') buildParams += iconParam
            const distBuildName = `${settings.BRAND_TARGET}-${settings.BUILD_PLATFORM}-${settings.BUILD_ARCH}`
            let execCommand = `electron-packager ${buildDir} ${settings.BRAND_TARGET} ${buildParams} --out=${distDir}`
            childExec(execCommand, undefined, (err, stdout, stderr) => {
                if (stderr) gutil.log(stderr)
                if (stdout) gutil.log(stdout)
                archive.directory(path.join(distDir, distBuildName), distBuildName)
                archive.finalize()
            })
        }
    })
})


gulp.task('build-run', 'Make a development build and run it in the target environment.', (done) => {
    let command = `gulp build --target ${settings.BUILD_TARGET} --brand ${settings.BRAND_TARGET}`
    const buildDir = `./build/${settings.BRAND_TARGET}/${settings.BUILD_TARGET}`
    if (settings.BUILD_TARGET === 'chrome') command = `${command};chromium --user-data-dir=/tmp/vialer-js --load-extension=${buildDir} --no-first-run`
    else if (settings.BUILD_TARGET === 'firefox') command = `${command};web-ext run --no-reload --source-dir ${buildDir}`
    else if (settings.BUILD_TARGET === 'electron') {
        const electronPath = './node_modules/electron/dist/electron'
        command = `${command};${electronPath} --js-flags='--harmony-async-await' ${buildDir}/main.js`
    } else if (settings.BUILD_TARGET === 'webview') {
        helpers.startDevServer()
        const urlTarget = `http://localhost:8999/${settings.BRAND_TARGET}/webview/index.html`
        command = `${command};chromium --disable-web-security --new-window ${urlTarget}`
    }
    childExec(command, undefined, (err, stdout, stderr) => {
        if (err) gutil.log(err)
    })
})


gulp.task('deploy', 'Deploy <BRAND_TARGET> to the <BUILD_TARGET> store.', (done) => {
    helpers.deploy(settings.BRAND_TARGET, settings.BUILD_TARGET, helpers.distributionName(settings.BRAND_TARGET))
        .then(() => {
            // Write release and source artifacts to sentry for more
            // precise stacktraces in Sentry.
            runSequence('sentry-sourcemaps', done)
        })
})



gulp.task('html', 'Preprocess and build application HTML.', () => {
    // The index.html file is shared with the electron build target.
    // Appropriate scripts are inserted based on the build target.
    return gulp.src(path.join('src', 'index.html'))
        .pipe(template({settings}))
        .pipe(flatten())
        .pipe(gulp.dest(`./build/${settings.BRAND_TARGET}/${settings.BUILD_TARGET}`))
        .pipe(ifElse(settings.LIVERELOAD, livereload))
})


gulp.task('__tmp-icons', 'Copy default SVG icons and brand icons to a temp dir.', (done) => {
    return gulp.src('./src/svg/*.svg', {base: 'src'})
        .pipe(addsrc(`./src/brand/${settings.BRAND_TARGET}/svg/*.svg`, {base: `./src/brand/${settings.BRAND_TARGET}/`}))
        .pipe(gulp.dest(path.join(settings.TEMP_DIR, settings.BRAND_TARGET)))
        .pipe(svgo())
        .pipe(size(_extend({title: 'icons'}, settings.SIZE_OPTIONS)))
})


/**
* Process all images with Vue-svgicon into Javascript Vue components,
* which can be included as regular components.
* TODO: Integrate vue-svgicon with Gulp.
*/
gulp.task('icons', 'Build an SVG iconset.', ['__tmp-icons'], (done) => {
    const srcDir = path.join(settings.TEMP_DIR, settings.BRAND_TARGET, 'svg')
    // The icons JavaScript is added inside the source.
    const srcBuildDir = path.join(settings.SRC_DIR, 'brand', settings.BRAND_TARGET, 'icons')
    let execCommand = `node_modules/vue-svgicon/bin/svg.js -s ${srcDir} -t ${srcBuildDir}`
    childExec(execCommand, undefined, (_err, stdout, stderr) => {
        if (stderr) gutil.log(stderr)
        if (stdout) gutil.log(stdout)
        done()
    })
})


gulp.task('js-electron', 'Generate Electron application.', (done) => {
    runSequence(['js-vendor', 'js-app-bg', 'js-app-fg'], async() => {
        // Vendor-specific info for Electron's main.js file.
        fs.createReadStream('./src/js/main.js').pipe(
            fs.createWriteStream(`./build/${settings.BRAND_TARGET}/${settings.BUILD_TARGET}/main.js`)
        )

        const electronBrandSettings = settings.brands[settings.BRAND_TARGET].vendor
        const settingsFile = `./build/${settings.BRAND_TARGET}/${settings.BUILD_TARGET}/settings.json`
        await writeFileAsync(settingsFile, JSON.stringify(electronBrandSettings))
        done()
    })
})


gulp.task('js-vendor', (done) => {
    runSequence('icons', 'js-vendor-bg', 'js-vendor-fg', () => {
        if (settings.LIVERELOAD) livereload.changed('web.js')
        done()
    })
})


gulp.task('js-vendor-bg', 'Generate third-party vendor js for the background.', [], (done) => {
    helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'bg/vendor', 'vendor_bg', [])
        .then(() => {
            done()
        })
})


gulp.task('js-vendor-fg', 'Generate third-party vendor js for the foreground.', (done) => {
    helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'fg/vendor', 'vendor_fg',
        [`./src/brand/${settings.BRAND_TARGET}/icons/index.js`])
        .then(() => {
            done()
        })
})


gulp.task('js-app-bg', 'Generate the extension background entry js.', (done) => {
    helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'bg/index', 'app_bg', [])
        .then(() => {
            if (settings.LIVERELOAD) livereload.changed('app_bg.js')
            if (WATCHTEST) runSequence(['test'], done)
            else done()
        })
})


gulp.task('js-app-fg', 'Generate webextension fg/popout js.', (done) => {
    helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'fg/index', 'app_fg', []).then(() => {
        if (settings.LIVERELOAD) livereload.changed('app_fg.js')
        if (WATCHTEST) runSequence(['test'], done)
        else done()
    })
})


gulp.task('js-app-modules', 'Generate background modules js.', ['i18n'], (done) => {
    const builtin = settings.brands[settings.BRAND_TARGET].modules.builtin
    const custom = settings.brands[settings.BRAND_TARGET].modules.custom

    Promise.all([
        helpers.jsModules(settings.BRAND_TARGET, settings.BUILD_TARGET, Object.assign(builtin, custom), 'bg'),
        helpers.jsModules(settings.BRAND_TARGET, settings.BUILD_TARGET, Object.assign(builtin, custom), 'fg'),
    ]).then(() => {
        if (settings.LIVERELOAD) livereload.changed('app_modules_bg.js')
        done()
    })
})


gulp.task('js-app-observer', 'Generate WebExtension icon observer that runs in every tab frame.', (done) => {
    helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'observer/index', 'app_observer', []).then(() => {
        if (WATCHTEST) runSequence(['test'], done)
        else done()
    })
})


gulp.task('manifest', 'Create a browser-specific manifest file.', async() => {
    let manifest = helpers.getManifest(settings.BRAND_TARGET, settings.BUILD_TARGET)
    const manifestTarget = path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET, 'manifest.json')
    await mkdirp(path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET))
    await writeFileAsync(manifestTarget, JSON.stringify(manifest, null, 4))
})


gulp.task('scss', 'Generate all CSS files.', [], (done) => {
    runSequence([
        'scss-app',
        'scss-observer',
    ], () => {
        // Targetting webext.css for livereload changed only works in the
        // webview.
        if (settings.LIVERELOAD) livereload.changed('app.css')
        done()
    })
})


gulp.task('scss-app', 'Generate application CSS.', () => {
    let sources = [path.join(settings.SRC_DIR, 'components', '**', '*.scss')]
    const builtin = settings.brands[settings.BRAND_TARGET].modules.builtin
    const custom = settings.brands[settings.BRAND_TARGET].modules.custom

    const sectionModules = Object.assign(builtin, custom)
    for (const moduleName of Object.keys(sectionModules)) {
        const sectionModule = sectionModules[moduleName]
        if (sectionModule.addons && sectionModule.addons.fg.length) {
            for (const addon of sectionModule.addons.fg) {
                const dirName = addon.split('/')[0]
                gutil.log(`[fg] addon styles for ${moduleName} (${addon})`)
                sources.push(path.join(settings.NODE_PATH, dirName, 'src', 'components', '**', '*.scss'))
            }
        } else if (sectionModule.parts && sectionModule.parts.includes('fg')) {
            gutil.log(`[fg] addon styles for ${moduleName} (${sectionModule.name})`)
            // The module may include a path to the source file.
            sources.push(path.join(settings.NODE_PATH, sectionModule.name, 'src', 'components', '**', '*.scss'))
        }
    }
    return helpers.scssEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'app', !settings.PRODUCTION, sources)
})


gulp.task('scss-observer', 'Generate observer CSS.', () => {
    return helpers.scssEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'observer', !settings.PRODUCTION)
})


gulp.task('scss-vendor', 'Generate vendor CSS.', () => {
    return helpers.scssEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'vendor', false)
})


gulp.task('sentry-release-remove', 'Remove a Sentry release and all of its artifacts.', (done) => {
    const sentryManager = helpers.sentryManager(settings.BRAND_TARGET, settings.BUILD_TARGET)
    sentryManager.remove(() => done)
})


/**
* This requires at least Sentry 8.17.0.
* See https://github.com/getsentry/sentry/issues/5459 for more details.
*/
gulp.task('sentry-sourcemaps', 'Upload release artifacts to Sentry for better stacktraces.', () => {
    const sentryManager = helpers.sentryManager(settings.BRAND_TARGET, settings.BUILD_TARGET)
    sentryManager.create(() => {
        const base = path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET, 'js')
        gulp.src(path.join(base, '{*.js,*.map}'), {base})
            .pipe(addsrc(path.join(settings.SRC_DIR, 'js', '**', '*.js'), {base: path.join('./')}))
            .pipe(sentryManager.upload())
    })
})


gulp.task('templates', 'Compile builtin and module Vue component templates.', () => {
    let sources = ['./src/components/**/*.vue']
    const builtin = settings.brands[settings.BRAND_TARGET].modules.builtin
    const custom = settings.brands[settings.BRAND_TARGET].modules.custom

    const sectionModules = Object.assign(builtin, custom)
    for (const moduleName of Object.keys(sectionModules)) {
        const sectionModule = sectionModules[moduleName]

        if (sectionModule.addons && sectionModule.addons.fg.length) {
            for (const addon of sectionModule.addons.fg) {
                const dirName = addon.split('/')[0]
                gutil.log(`[fg] addon templates for ${moduleName} (${addon})`)
                sources.push(path.join(settings.NODE_PATH, dirName, 'src', 'components', '**', '*.vue'))
            }
        } else if (sectionModule.parts && sectionModule.parts.includes('fg')) {
            gutil.log(`[fg] custom templates for ${moduleName} (${sectionModule.name})`)
            // The module may include a path to the source file.
            sources.push(path.join(settings.NODE_PATH, sectionModule.name, 'src', 'components', '**', '*.vue'))
        }
    }

    gulp.src(sources)
        .pipe(fuet({
            commonjs: false,
            namespace: 'global.templates',
            pathfilter: ['src', 'components', 'node_modules'],
        }))
        .on('error', notify.onError('Error: <%= error.message %>'))
        .pipe(ifElse(settings.PRODUCTION, () => minifier()))
        .on('end', () => {
            if (settings.LIVERELOAD) livereload.changed('templates.js')
        })
        .pipe(concat('templates.js'))
        .pipe(insert.prepend('global.templates={};'))
        .pipe(gulp.dest(path.join(settings.BUILD_DIR, settings.BRAND_TARGET, settings.BUILD_TARGET, 'js')))
        .pipe(size(_extend({title: 'templates'}, settings.SIZE_OPTIONS)))
})


gulp.task('test', 'Run all unit and integation tests.', function() {
    return gulp.src('test/bg/**/*.js')
        .pipe(tape({
            outputStream: test.createStream().pipe(colorize()).pipe(process.stdout),
        }))
})


gulp.task('test-browser', 'Run all browser tests on the webview.', ['build'], function() {
    if (!settings.LIVERELOAD) helpers.startDevServer()

    return gulp.src('test/browser/**/*.js')
        .pipe(tape({
            outputStream: test.createStream().pipe(colorize()).pipe(process.stdout),
        }))
        .on('end', () => {
            if (!settings.LIVERELOAD) process.exit(0)
        })
})


gulp.task('i18n', 'Generate i18n translations.', (done) => {
    const builtin = settings.brands[settings.BRAND_TARGET].modules.builtin
    const custom = settings.brands[settings.BRAND_TARGET].modules.custom
    Promise.all([
        helpers.jsModules(settings.BRAND_TARGET, settings.BUILD_TARGET, Object.assign(builtin, custom), 'i18n'),
        helpers.jsEntry(settings.BRAND_TARGET, settings.BUILD_TARGET, 'i18n/index', 'app_i18n', []),
    ]).then(() => {
        if (settings.LIVERELOAD) livereload.changed('app_i18n.js')
        done()
    })
})


gulp.task('watch', 'Start development server, watch files for changes and auto-rebuild.', () => {
    settings.LIVERELOAD = true
    helpers.startDevServer()


    if (settings.BUILD_TARGET === 'electron') {
        gulp.watch([path.join(__dirname, 'src', 'js', 'main.js')], ['js-electron'])
    } else if (settings.BUILD_TARGET === 'node') {
        // Node development doesn't require transpilation. All
        // other watchers are not needed at the moment.
        gulp.watch([path.join(__dirname, 'src', 'js', '**', '*.js')], ['test'])
        return
    } else if (!['electron', 'webview'].includes(settings.BUILD_TARGET)) {
        gulp.watch(path.join(__dirname, 'src', 'manifest.json'), ['manifest'])
        gulp.watch(path.join(__dirname, 'src', 'brand.json'), ['build'])
    }

    gulp.watch([
        path.join(__dirname, 'src', '_locales', '**', '*.json'),
        path.join(__dirname, 'src', 'js', 'lib', 'thirdparty', '**', '*.js'),
    ], ['assets'])


    gulp.watch([
        path.join(__dirname, 'src', 'js', 'i18n', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-adapter-*', 'src', 'js', 'i18n', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-addon-*', 'src', 'js', 'i18n', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-mod-*', 'src', 'js', 'i18n', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-provider-*', 'src', 'js', 'i18n', '*.js'),
    ], ['i18n'])

    gulp.watch(path.join(__dirname, 'src', 'index.html'), ['html'])

    gulp.watch([
        path.join(__dirname, 'src', 'js', 'bg', '**', '*.js'),
        path.join(__dirname, 'src', 'js', 'lib', '**', '*.js'),
    ], ['js-app-bg'])

    gulp.watch([
        path.join(__dirname, 'src', 'components', '**', '*.js'),
        path.join(__dirname, 'src', 'js', 'lib', '**', '*.js'),
        path.join(__dirname, 'src', 'js', 'fg', '**', '*.js'),
    ], ['js-app-fg'])

    gulp.watch([
        // Glob for addons and custom modules includes both component and module js.
        path.join(settings.NODE_PATH, 'vjs-adapter-*', 'src', '**', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-addon-*', 'src', '**', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-mod-*', 'src', '**', '*.js'),
        path.join(settings.NODE_PATH, 'vjs-provider-*', 'src', '**', '*.js'),
    ], ['js-app-modules'])

    gulp.watch([
        path.join(__dirname, 'src', 'js', 'observer', '**', '*.js'),
        path.join(__dirname, 'src', 'js', 'lib', '**', '*.js'),
    ], ['js-app-observer'])

    gulp.watch(path.join(__dirname, 'src', 'js', '{bg/vendor.js,fg/vendor.js}'), ['js-vendor'])

    gulp.watch([
        path.join(__dirname, 'src', 'scss', '**', '*.scss'),
        `!${path.join(__dirname, 'src', 'scss', 'observer.scss')}`,
        path.join(__dirname, 'src', 'components', '**', '*.scss'),
        path.join(settings.NODE_PATH, 'vjs-addon-*', 'src', 'components', '**', '*.scss'),
        path.join(settings.NODE_PATH, 'vjs-mod-*', 'src', 'components', '**', '*.scss'),
    ], ['scss-app'])

    gulp.watch(path.join(__dirname, 'src', 'scss', 'observer.scss'), ['scss-observer'])
    gulp.watch(path.join(__dirname, 'src', 'scss', 'vendor.scss'), ['scss-vendor'])

    gulp.watch([
        path.join(__dirname, 'src', 'components', '**', '*.vue'),
        path.join(settings.NODE_PATH, 'vjs-addon-*', 'src', 'components', '**', '*.vue'),
        path.join(settings.NODE_PATH, 'vjs-mod-*', 'src', 'components', '**', '*.vue'),
    ], ['templates'])

    gulp.watch(path.join(__dirname, 'test', '**', '*.js'), ['test'])
})
