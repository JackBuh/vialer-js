/**
* Setup options to run a bg instance of Vialer-js can be a bit
* verbose, that's why this is handled from one place for both
* Node and Browsers.
*/
module.exports = (function() {
    const env = require('../../lib/env')({section: 'bg'})

    let options = {
        env,
        plugins: {
            builtin: [
                {module: require('../modules/activity'), name: 'activity'},
                {module: require('../modules/app'), name: 'app'},
                {
                    addons: null,
                    module: require('../modules/availability'),
                    name: 'availability',
                },
                {module: require('../modules/calls'), name: 'calls'},
                {
                    i18n: null,
                    module: require('../modules/contacts'),
                    name: 'contacts',
                    providers: null,
                },
                {module: require('../modules/settings'), name: 'settings'},
                {module: require('../modules/ui'), name: 'ui'},
                {
                    adapter: null,
                    i18n: null,
                    module: require('../modules/user'),
                    name: 'user',
                },
            ],
            custom: null,
        },
    }

    let availabilityPlugin = options.plugins.builtin.find((i) => i.name === 'availability')
    let contactsPlugin = options.plugins.builtin.find((i) => i.name === 'contacts')
    let userPlugin = options.plugins.builtin.find((i) => i.name === 'user')

    // Load modules from settings.
    if (env.isNode) {
        const rc = require('rc')
        let settings = {}
        rc('vialer-js', settings)
        const BRAND = process.env.BRAND ? process.env.BRAND : 'bologna'
        const brand = settings.brands[BRAND]
        availabilityPlugin.addons = brand.plugins.builtin.availability.addons
        contactsPlugin.providers = brand.plugins.builtin.contacts.providers
        contactsPlugin.i18n = brand.plugins.builtin.contacts.i18n
        userPlugin.adapter = brand.plugins.builtin.user.adapter
        userPlugin.i18n = brand.plugins.builtin.user.i18n
        options.plugins.custom = brand.plugins.custom
    } else {
        // Load plugins through envify replacement.
        availabilityPlugin.addons = process.env.BUILTIN_AVAILABILITY_ADDONS
        contactsPlugin.providers = process.env.BUILTIN_CONTACTS_PROVIDERS
        contactsPlugin.i18n = process.env.BUILTIN_USER_I18N
        userPlugin.adapter = process.env.BUILTIN_USER_ADAPTER
        userPlugin.i18n = process.env.BUILTIN_USER_I18N
        options.plugins.custom = process.env.CUSTOM_MOD

        // Add an extra extension-specific module.
        if (env.isExtension) {
            options.plugins.builtin.push({module: require('../modules/extension'), name: 'extension'})
        }
    }

    return options
})()
