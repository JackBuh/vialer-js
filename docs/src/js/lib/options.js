module.exports = (function() {
    const env = require('vialer-js/lib/env')({section: 'app'})

    let options = {
        env,
        plugins: {
            builtin: [
                {module: require('../modules/stories'), name: 'stories'},
            ],
            custom: [],
        },
    }

    return options
})()
