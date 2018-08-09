module.exports = (app) => {

    const ViewStory = {
        render: templates.view_story.r,
        staticRenderFns: templates.view_story.s,
        store: {
            stories: 'stories',
        },
    }

    return ViewStory
}
