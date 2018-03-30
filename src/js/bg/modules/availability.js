/**
* VoIPGRID-platform specific functionality. Within the platform, it is
* possible to set a user's availability. This has effect when the
* user is part of a dialplan and can be used to dynamically switch
* between endpoints.
* @module ModuleAvailability
*/
const Module = require('../lib/module')


/**
* Main entrypoint for Availability.
* @memberof AppBackground.modules
*/
class ModuleAvailability extends Module {
    /**
    * @param {AppBackground} app - The background application.
    */
    constructor(app) {
        super(app)
        /**
        * Notify the VoIPGRID API about the availability change and set
        * the background state to the new situation.
        */
        this.app.on('bg:availability:update', async({available, selected, destinations}) => {
            // Set an icon depending on whether the user is available.
            let endpoint = `api/selecteduserdestination/${this.app.state.availability.sud}/`
            let res
            this.app.setState({availability: {available, destinations, placeholder: selected, selected: selected}}, {persist: true})

            if (available) {
                this.app.setState({ui: {menubar: {default: 'active'}}})
                res = await this.app.api.client.put(endpoint, {
                    fixeddestination: selected.type === 'fixeddestination' ? selected.id : null,
                    phoneaccount: selected.type === 'phoneaccount' ? selected.id : null,
                })
            } else {
                this.app.setState({ui: {menubar: {default: 'unavailable'}}})
                res = await this.app.api.client.put(endpoint, {fixeddestination: null, phoneaccount: null})
            }

            if (this.app.api.UNAUTHORIZED_STATUS.includes(res.status)) {
                this.app.logger.warn(`${this}unauthorized availability request`)
                return
            }
        })
    }


    /**
    * Initializes the module's store.
    * Notice that the `sud` property is used to keep track of the
    * selecteduserdestination API endpoint reference.
    * @returns {Object} The module's store properties.
    */
    _initialState() {
        return {
            available: false,
            destinations: [],
            dnd: false,
            phoneaccounts: [],
            placeholder: {
                id: null,
                name: null,
                type: null,
            },
            selected: {
                id: null,
                name: null,
                type: null,
            },
            sud: null, // This is a fixed id used to build the API endpoint for selected userdestination.
        }
    }


    /**
    * Do an API request to get an update of the available userdestination
    * options when the module is loaded in the background.
    */
    async _platformData() {
        const res = await this.app.api.client.get('api/userdestination/')
        if (this.app.api.NOTOK_STATUS.includes(res.status)) {
            this.app.logger.warn(`${this}platform data request failed (${res.status})`)
            return
        }

        // Lets format the data in a select-friendly way.
        const userdestination = res.data.objects[0]
        let fixed = userdestination.fixeddestinations
        let voip = userdestination.phoneaccounts
        fixed = fixed.map(fd => ({id: parseInt(fd.id), name: `${fd.phonenumber} - ${fd.description}`, type: 'fixeddestination'}))
        voip = voip.map(fd => ({id: parseInt(fd.id), name: `${fd.internal_number} - ${fd.description}`, type: 'phoneaccount'}))

        // The actual form data.
        let selected = {id: null, name: null, type: null}
        let destinations = []
        destinations = [...fixed, ...voip]

        const sud = userdestination.selecteduserdestination
        if (sud.fixeddestination) selected = destinations.find((d) => d.id === sud.fixeddestination)
        else if (sud.phoneaccount) selected = destinations.find((d) => d.id === sud.phoneaccount)

        // Platform users select an existing WebRTC-SIP VoIP-account.
        let platformAccounts = userdestination.phoneaccounts.map((i) => ({
            id: i.id,
            name: i.description,
            password: i.password,
            username: i.account_id,
        }))

        this.app.setState({
            availability: {available: Boolean(selected.id), destinations, selected, sud: sud.id},
            settings: {webrtc: {account: {options: platformAccounts}}},
        }, {persist: true})

        // Set an available icon when the user is available.
        if (selected.id && !this.app.state.availability.dnd) this.app.setState({ui: {menubar: {default: 'active'}}})
        else this.app.setState({ui: {menubar: {default: 'unavailable'}}})
    }


    /**
    * Setup availability-specific store watchers.
    * @returns {Object} - Properties that need to be watched.
    */
    _watchers() {
        return {
            'store.availability.dnd': (newVal, oldVal) => {
                if (this.app.env.isExtension) {
                    // Dnd is set. Set the menubar to inactive.
                    if (newVal) browser.browserAction.setIcon({path: 'img/menubar-unavailable.png'})
                    // Restore the previous value.
                    else browser.browserAction.setIcon({path: 'img/menubar-active.png'})
                }
            },
        }
    }


    /**
    * Generate a representational name for this module. Used for logging.
    * @returns {String} - An identifier for this module.
    */
    toString() {
        return `${this.app}[availability] `
    }
}

module.exports = ModuleAvailability