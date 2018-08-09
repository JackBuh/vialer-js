const Plugin = require('vialer-js/lib/plugin')

class PluginStories extends Plugin {

    constructor(app) {
        super(app)

        app.router.addRoutes([{
            alias: 'view_story',
            component: app.components.ViewStory,
            name: 'view_story',
            path: '/stories/:story_id',
        }])
    }


    /**
    * Generate a representational name for this module. Used for logging.
    * @returns {String} - An identifier for this module.
    */
    toString() {
        return `${this.app}[app] `
    }
}


module.exports = PluginStories
