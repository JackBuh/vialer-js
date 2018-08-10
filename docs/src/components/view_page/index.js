module.exports = (app) => {
    const markdownIt = new MarkdownIt({
        highlight: function(str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(lang, str).value
            }
            return ''
        },
    })

    const ViewStory = {
        computed: {
            page: function() {
                if (this.$route.name === 'view_readme') {
                    return markdownIt.render(this.readme)
                } else {
                    let topic = this.topics.find((i) => i.name === this.$route.params.topic_id)
                    if (topic) return markdownIt.render(topic.content)
                }

                return ''
            },
        },
        render: templates.view_page.r,
        staticRenderFns: templates.view_page.s,
        store: {
            readme: 'pages.readme',
            topics: 'pages.topics',
        },
    }

    return ViewStory
}
