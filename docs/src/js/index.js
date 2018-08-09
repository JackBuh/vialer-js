require('module-alias/register')

const App = require('vialer-js/lib/app')
require('./i18n')

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

        this.components = {
            Sidebar: require('../components/sidebar'),
            ViewStory: require('../components/view_story'),
        }

        this.router = new VueRouter({
            base: '/',
            linkActiveClass: 'is-active',
            mode: 'hash',
        })

        this.__loadPlugins(this.__plugins)

        for (const name of Object.keys(this.components)) {
            Vue.component(name, this.components[name](this))
        }

        this.__initStore({
            stories: global.stories,
        })
        this.__initViewModel()
        this.vm.$mount(document.querySelector('#app-placeholder'))


    }
}

global.options = require('./lib/options')

global.AppDocs = AppDocs
module.exports = AppDocs
