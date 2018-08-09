const fs = require('fs')
const path = require('path')

const argv = require('yargs').argv
const gutil = require('gulp-util')
const rc = require('rc')


// The main settings object containing info from .vialer-jsrc and build flags.

module.exports = (function() {
    let settings = {}
    // BASE_DIR is used as reference anywhere.
    settings.BASE_DIR = path.join(__dirname, '../')

    settings.BUILD_ARCH = argv.arch ? argv.arch : 'x64' // all, or one or more of: ia32, x64, armv7l, arm64, mips64el
    settings.BUILD_DIR = process.env.BUILD_DIR || path.join(settings.BASE_DIR, 'build')
    settings.BUILD_PLATFORM = argv.platform ? argv.platform : 'linux' // all, or one or more of: darwin, linux, mas, win32
    settings.BRAND_TARGET = argv.brand ? argv.brand : process.env.BRAND ? process.env.BRAND : 'bologna'
    settings.BUILD_TARGET = argv.target ? argv.target : 'chrome'
    settings.BUILD_TARGETS = ['chrome', 'docs', 'electron', 'edge', 'firefox', 'node', 'webview']

    // Exit when the build target is not in the allowed list.
    if (!settings.BUILD_TARGETS.includes(settings.BUILD_TARGET)) {
        gutil.log(`Invalid build target: ${settings.BUILD_TARGET}`)
        process.exit(0)
    } else {
        // Simple brand file verification.
        for (let brand in settings.brands) {
            try {
                fs.statSync(`./src/brand/${brand}`)
            } catch (err) {
                gutil.log(`(!) Brand directory is missing for brand "${brand}"`)
                process.exit(0)
            }
        }
        // Force the build target to webview, since that is what
        // Puppeteer needs atm.
        if (argv._[0] === 'test-browser') {
            settings.BUILD_TARGET = 'webview'
            // Make this variable accessible by tests.
            process.env.BRAND = settings.BRAND_TARGET
        }
    }

    // Default deploy target is `alpha` because it has the least impact.
    settings.DEPLOY_TARGET = argv.deploy ? argv.deploy : 'alpha'
    // Exit when the deploy target is not in the allowed list.
    if (!['alpha', 'beta', 'production'].includes(settings.DEPLOY_TARGET)) {
        gutil.log(`Invalid deployment target: '${settings.DEPLOY_TARGET}'`)
        process.exit(0)
    }
    settings.LIVERELOAD = false
    settings.NODE_PATH = path.join(settings.BASE_DIR, 'node_modules') || process.env.NODE_PATH
    settings.PACKAGE = require(`${settings.BASE_DIR}/package`)
    settings.SRC_DIR = path.join(settings.BASE_DIR, 'src')

    settings.SIZE_OPTIONS = {showFiles: true, showTotal: true}
    settings.TEMP_DIR = path.join(settings.BUILD_DIR, '__tmp')
    settings.VERBOSE = argv.verbose ? true : false
    settings.VERSION = argv.version ? argv.version : settings.PACKAGE.version
    // Override the pre-defined release name structure to specifically target
    // release names in Sentry.
    if (argv.release) settings.RELEASE = argv.release

    // Force production mode when running certain tasks from
    // the commandline or when using a deploy command.
    if (argv._[0] && (['deploy', 'build-dist'].includes(argv._[0]) || argv._[0].includes('deploy'))) {
        settings.PRODUCTION = true
        // Force NODE_ENV to production for envify.
        process.env.NODE_ENV = 'production'
    } else {
        // Production mode is on when NODE_ENV environmental var is set.
        settings.PRODUCTION = argv.production ? argv.production : (process.env.NODE_ENV === 'production')
        if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
    }

    settings.NODE_ENV = process.env.NODE_ENV
    // Load the Vialer settings from ~/.vialer-jsrc into the existing settings.
    rc('vialer-js', settings)

    // Notify developer about some essential build flag values.
    gutil.log('BUILD FLAGS:')
    gutil.log(`- BRAND: ${settings.BRAND_TARGET}`)
    gutil.log(`- DEPLOY: ${settings.DEPLOY_TARGET}`)
    gutil.log(`- PRODUCTION: ${settings.PRODUCTION}`)
    gutil.log(`- TARGET: ${settings.BUILD_TARGET}`)
    gutil.log(`- VERBOSE: ${settings.VERBOSE}`)

    return settings
})()
