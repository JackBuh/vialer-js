const path = require('path')

module.exports = function(settings) {
    return async function(runner, screens) {
        await runner.waitFor('.greeting')
        if (screens) await runner.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(runner)}login.png`)})

        // The voip adapter has an endpoint field that must be filled.
        if (settings.modules.builtin.user.adapter === 'vjs-adapter-user-voip') {
            await runner.type('input[name="endpoint"]', settings.tests.endpoint)
        }

        await runner.type('input[name="username"]', settings.tests[runner._name].username)
        await runner.type('input[name="password"]', settings.tests[runner._name].password)
        if (screens) await runner.screenshot({path: path.join(settings.tests.screenshots, `${settings.tests.step(runner)}login-credentials.png`)})

        await runner.click('.test-login-button')
        await runner.waitFor('.component-wizard-welcome')
    }
}
