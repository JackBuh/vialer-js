const Module = require('vialer-js/lib/module')

class ModuleStories extends Module {

    constructor(app) {
        super(app)

        this._notifications = {}
        console.log("MODULE LOADED")
    }


    /**
    * Generate a representational name for this module. Used for logging.
    * @returns {String} - An identifier for this module.
    */
    toString() {
        return `${this.app}[app] `
    }
}


module.exports = ModuleStories
