const {promisify} = require('util')
const mkdirp = promisify(require('mkdirp'))
const path = require('path')
const puppeteer = require('puppeteer')
const rc = require('rc')
const test = require('tape')


let settings = {}
rc('vialer-js', settings)

// Environment initialization.
const BRAND = process.env.BRAND ? process.env.BRAND : 'bologna'
let ENDPOINT, PASSWORDS = {}, USERNAMES = {}

const SCREENSPATH = path.join(__dirname, '../', '../', 'docs', 'screenshots', BRAND)

// WARNING: Do NOT log CI variables while committing to Github.
// This may expose the Circle CI secrets in the build log. Change the
// account credentials immediately when this happens.
if (process.env[`CI_USERNAME_ALICE_${BRAND.toUpperCase()}`]) {
    ENDPOINT = process.env[`CI_ENDPOINT_${BRAND.toUpperCase()}`]
    USERNAMES = {
        alice: process.env[`CI_USERNAME_ALICE_${BRAND.toUpperCase()}`],
        bob: process.env[`CI_USERNAME_BOB_${BRAND.toUpperCase()}`],
    }
    PASSWORDS = {
        alice: process.env[`CI_PASSWORD_ALICE_${BRAND.toUpperCase()}`],
        bob: process.env[`CI_PASSWORD_BOB_${BRAND.toUpperCase()}`],
    }
} else {
    ENDPOINT = settings.brands[BRAND].tests.endpoint
    USERNAMES = {
        alice: settings.brands[BRAND].tests.alice.username,
        bob: settings.brands[BRAND].tests.bob.username,
    }
    PASSWORDS = {
        alice: settings.brands[BRAND].tests.alice.password,
        bob: settings.brands[BRAND].tests.bob.password,
    }
}

let _step = 0
const step = () => {_step += 1; return _step}



test('[browser] <alice> I am logging in.', async(t) => {
    await mkdirp(SCREENSPATH)

    const browser = await puppeteer.launch({
        args: [
            '--disable-web-security',
            '--hide-scrollbars',
            '--ignore-certificate-errors',
            '--no-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
        ],
        headless: settings.brands[BRAND].tests.headless,
        pipe: true,
    })

    let alice, bob
    const pages = await browser.pages()
    if (!pages.length) {
        alice = await browser.newPage()
        bob = await browser.newPage()
    } else {
        alice = pages[0]
        bob = await browser.newPage()
    }

    if (!settings.brands[BRAND].tests.headless) {
        alice.setViewport({height: 600, width: 500})
        bob.setViewport({height: 600, width: 500})
    }

    const uri = `${settings.brands[BRAND].tests.port}/${BRAND}/webview/`
    await Promise.all([
        alice.goto(`http://localhost:${uri}`, {waitUntil: 'networkidle0'}),
        bob.goto(`http://127.0.0.1:${uri}`, {waitUntil: 'networkidle0'}),
    ])

    await alice.waitFor('.greeting')
    await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-login.png`)})

    // The voip adapter has an endpoint field that must be filled.
    if (settings.brands[BRAND].modules.builtin.user.adapter === 'vjs-adapter-user-voip') {
        await alice.type('input[name="endpoint"]', ENDPOINT)
    }

    await alice.type('input[name="username"]', USERNAMES.alice)
    await alice.type('input[name="password"]', PASSWORDS.alice)
    await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-login-credentials.png`)})
    await alice.click('.test-login-button')

    await alice.waitFor('.component-wizard-welcome')

    t.end()
    test('[browser] <alice> I am going to complete the wizard.', async(_t) => {
        await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-wizard-welcome.png`)})
        await alice.click('.test-wizard-welcome-next')

        await alice.waitFor('.component-wizard-telemetry')
        await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-wizard-telemetry.png`)})
        await alice.click('.test-wizard-telemetry-yes')

        // For now, only vjs-adapter-user-vg supports account selection.
        if (settings.brands[BRAND].modules.builtin.user.adapter === 'vjs-adapter-user-vg') {
            // Wait for the select to be filled by the platform API call.
            await alice.waitFor('.component-wizard-account')
            await alice.waitFor('select option:not([disabled="disabled"])')
            await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-wizard-account.png`)})
            await alice.click('.test-wizard-account-next')
        }

        await alice.waitFor('.component-wizard-mic-permission')
        await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-wizard-mic-permission.png`)})
        await alice.click('.test-wizard-mic-permission-next')

        await alice.waitFor('.component-wizard-devices')
        await alice.waitFor('select option:not([disabled="disabled"])')
        let [inputOptions, outputOptions, soundsOptions] = await Promise.all([
            alice.$$('#input_device option'),
            alice.$$('#output_device option'),
            alice.$$('#sounds_device option'),
        ])

        // There are exactly 3 fake input/output devices.
        t.equal(inputOptions.length, 3, 'input devices are filled from browser devices query')
        t.equal(outputOptions.length, 3, 'output devices are filled from browser devices query')
        t.equal(soundsOptions.length, 3, 'sounds devices are filled from browser devices query')

        await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-wizard-devices.png`)})
        await alice.click('.test-wizard-devices-next')

        await alice.waitFor('.component-main-statusbar')

        // Bring Bob to life by cloning Alice.
        const vaultKey = await alice.evaluate('bg.crypto.storeVaultKey()')
        let bobState = await alice.evaluate('bg.state')
        let account = bobState.settings.webrtc.account.selected

        if (settings.brands[BRAND].modules.builtin.user.adapter === 'vjs-adapter-user-vg') {
            account = bobState.settings.webrtc.account.options[2]
        } else {
            account.username = USERNAMES.bob.split('@')[0]
            account.password = PASSWORDS.bob
            account.uri = `sip:${USERNAMES.bob}`
        }
        await bob.evaluate(`bg.setState(${JSON.stringify(bobState)})`)
        await bob.evaluate(`bg.crypto._importVaultKey('${vaultKey}')`)
        await bob.evaluate('bg.modules.calls.connect()')
        // Wait until bob is connected.
        await bob.waitFor('.component-main-statusbar.ok')

        _t.end()

        // Open a second tab and get another tab ready.
        test('[browser] <alice> I am calling bob.', async(__t) => {
            await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-ready-to-use.png`)})

            // Close audio settings check notification and head over to the calls page.
            await alice.click('.notification .test-delete')
            await alice.click('.component-main-menubar .test-menubar-calls')

            // Enter a number and press the call button.
            await alice.waitFor('.component-call-keypad')
            await alice.click('.component-call-keypad .test-key-2')
            await alice.click('.component-call-keypad .test-key-2')
            await alice.click('.component-call-keypad .test-key-9')
            await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-dialpad-call.png`)})
            await alice.click('.test-call-button')

            await alice.waitFor('.component-calls .call-ongoing')
            await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-calldialog-outgoing.png`)})

            __t.end()

            test('[browser] <bob> alice is calling; let\'s talk.', async(___t) => {
                await bob.waitFor('.component-calls .call-ongoing')
                await bob.screenshot({path: path.join(SCREENSPATH, `${step()}-calldialog-incoming.png`)})
                await bob.click('.component-call .test-button-accept')
                // Alice and bob are now getting connected;
                // wait for Alice to see the connected screen.
                await alice.waitFor('.component-call .call-options')
                await alice.screenshot({path: path.join(SCREENSPATH, `${step()}-calldialog-outgoing-accepted.png`)})
                await bob.screenshot({path: path.join(SCREENSPATH, `${step()}-calldialog-incoming-accepted.png`)})

                await browser.close()
                ___t.end()
            })
        })
    })
})
