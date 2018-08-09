module.exports = (app) => {

    const Sidebar = {
        render: templates.sidebar.r,
        staticRenderFns: templates.sidebar.s,
        store: {

        },
    }

    return Sidebar
}
