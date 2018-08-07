const {promisify} = require('util')
const mkdirp = promisify(require('mkdirp'))
const path = require('path')
const puppeteer = require('puppeteer')
const rc = require('rc')
const test = require('tape')

// Environment initialization.
const BRAND = process.env.BRAND ? process.env.BRAND : 'bologna'
const SCREENS = process.env.SCREENS ? true : false

let settings = {}
rc('vialer-js', settings)
settings = settings.brands[BRAND]
// Allows to override the headless setting with an environment flag.
const HEADLESS = process.env.HEADLESS ? true : settings.tests.headless

Object.assign(settings.tests, {
    screenshots: path.join(__dirname, '../', '../', 'docs', 'screenshots', BRAND),
    step: function(runner) {
        if (!this.steps[runner._name]) this.steps[runner._name] = 0
        this.steps[runner._name] += 1
        return `${runner._name}-${this.steps[runner._name]}-`
    },
    steps: {},
})

// Application sections.
const login = require('./login')(settings)
const wizard = require('./wizard')(settings)


// WARNING: Do NOT log CI variables while committing to Github.
// This may expose the Circle CI secrets in the build log. Change the
// account credentials immediately when this happens.
if (process.env[`CI_USERNAME_ALICE_${BRAND.toUpperCase()}`]) {
    settings.tests.endpoint = process.env[`CI_ENDPOINT_${BRAND.toUpperCase()}`]
    settings.tests.alice.username = process.env[`CI_USERNAME_ALICE_${BRAND.toUpperCase()}`]
    settings.tests.alice.password = process.env[`CI_PASSWORD_ALICE_${BRAND.toUpperCase()}`]
    settings.tests.bob.username = process.env[`CI_USERNAME_BOB_${BRAND.toUpperCase()}`]
    settings.tests.bob.password = process.env[`CI_PASSWORD_BOB_${BRAND.toUpperCase()}`]
}


/**
* Each test user has its own browser.
* @param {String} name - Name of the testrunner.
* @returns {Object} - Browser and pages.
*/
async function createBrowser(name) {
    let browser = await puppeteer.launch({
        args: [
            '--disable-web-security',
            '--hide-scrollbars',
            '--ignore-certificate-errors',
            '--no-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
        ],
        headless: HEADLESS,
        pipe: true,
    })

    let pages = await browser.pages()
    pages[0]._name = name
    return {browser, pages}
}


test('[browser] <alice> I am logging in.', async(t) => {
    await mkdirp(settings.tests.screenshots)

    let [browserAlice, browserBob] = await Promise.all([createBrowser('alice'), createBrowser('bob')])
    let alice = browserAlice.pages[0]
    let bob = browserBob.pages[0]


    alice.setViewport({height: 600, width: 500})
    bob.setViewport({height: 600, width: 500})


    const uri = `${settings.tests.port}/${BRAND}/webview/index.html?test=true`
    await Promise.all([
        alice.goto(`http://localhost:${uri}`, {}),
        bob.goto(`http://127.0.0.1:${uri}`, {}),
    ])

    await Promise.all([
        await login(alice, SCREENS),
        await login(bob, false),
    ])

    t.end()
    test('[browser] <alice> I am going to complete the wizard.', async(_t) => {

        let [aliceOptions, bobOptions] = await Promise.all([
            await wizard(alice, SCREENS),
            await wizard(bob, false),
        ])

        if (SCREENS) await alice.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(alice)}ready-to-use.png`)})

        await Promise.all([
            alice.click('.test-delete-notification'),
            bob.click('.test-delete-notification'),
        ])

        // Check that there are 3 fake input/output/sound devices at the start.
        const aliceDevices = aliceOptions.input.length + aliceOptions.output.length + aliceOptions.sounds.length
        const bobDevices = bobOptions.input.length + bobOptions.output.length + bobOptions.sounds.length
        t.equal(aliceDevices, 9, '[browser] <alice> all devices are available')
        t.equal(bobDevices, 9, '[browser] <bob> all devices are available')


        _t.end()

        // Open a second tab and get another tab ready.
        test('[browser] <alice> I am calling bob.', async(__t) => {


            // Enter a number and press the call button.
            await alice.waitFor('.component-call-keypad')
            await alice.click('.component-call-keypad .test-key-2')
            await alice.click('.component-call-keypad .test-key-2')
            await alice.click('.component-call-keypad .test-key-9')
            if (SCREENS) await alice.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(alice)}dialpad-call.png`)})
            await alice.click('.test-call-button')

            await alice.waitFor('.component-calls .call-ongoing')
            if (SCREENS) await alice.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(alice)}calldialog-outgoing.png`)})

            __t.end()

            test('[browser] <bob> alice is calling; let\'s talk.', async(___t) => {
                await bob.waitFor('.component-calls .call-ongoing')
                await bob.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(bob)}calldialog-incoming.png`)})
                await bob.click('.component-call .test-button-accept')
                // Alice and bob are now getting connected;
                // wait for Alice to see the connected screen.
                await alice.waitFor('.component-call .call-options')
                if (SCREENS) await alice.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(alice)}calldialog-outgoing-accepted.png`)})
                if (SCREENS) await bob.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(bob)}calldialog-incoming-accepted.png`)})

                await browserAlice.browser.close()
                await browserBob.browser.close()
                ___t.end()
            })
        })
    })
})
