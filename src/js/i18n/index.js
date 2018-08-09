/**
* Process all translations from Vialer-js and its modules.
* The i18n parts of the modules are already included in
* `app_i18n_plugins.js`. All this class does is to use
* the browserify included `require` to lookup the modules
* and include the translations to the main file.
*/
class I18nTranslations {

    constructor(app, modules) {
        this.translations = {}
        this.translations.nl = require('./nl')

        for (const builtinModule of modules.builtin) {
            if (builtinModule.i18n) {
                builtinModule.i18n.forEach((i) => {
                    app.__mergeDeep(this.translations, require(`${i}/src/js/i18n`))
                })
            }

            if (builtinModule.addons && builtinModule.addons.i18n) {
                builtinModule.addons.i18n.forEach((i) => {
                    app.__mergeDeep(this.translations, require(`${i}/src/js/i18n`))
                })
            }
        }

        for (const name of Object.keys(modules.custom)) {
            if (modules.custom[name].parts.includes('i18n')) {
                app.__mergeDeep(this.translations, require(`${modules.custom[name].name}/src/js/i18n`))
            }
        }
    }
}

global.I18nTranslations = I18nTranslations
