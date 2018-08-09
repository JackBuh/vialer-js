const App = require('vialer-js/lib/app')
require('vialer-js/i18n')

require('module-alias/register')
/**
* A minimal Vue-powered documentation website, reusing as much
* as possible from the Vialer-js source. Reason for building
* is that we want branded documentation, and a higher degree
* of control over how the documentation looks and is being
* generated.
*/
class AppDocs extends App {

    constructor(options) {
        super(options)

        this.vm = new Vue({
            data: {store: this.state},
            render: h => h(require('../components/main')(this)),
        })

        this.components = {
            Sidebar: require('../components/sidebar'),
        }

        for (const name of Object.keys(this.components)) {
            Vue.component(name, this.components[name](this))
        }

        this.__initStore()
        this.__initViewModel()
        this.vm.$mount(document.querySelector('#app-placeholder'))
    }
}

global.options = require('vialer-js/fg/lib/options')

global.AppDocs = AppDocs
module.exports = AppDocs
