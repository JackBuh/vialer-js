module.exports = (app) => {

    const Sidebar = {
        render: templates.sidebar.r,
        staticRenderFns: templates.sidebar.s,
        store: {
            stories: 'stories',
        },
    }

    return Sidebar
}
