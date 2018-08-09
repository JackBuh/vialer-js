<component class="component-sidebar">
    <header class="sidebar-header">
        <div class="title">

        </div>
    </header>
    <nav class="sidebar-navigation">
        <header>Topics</header>
        <div class="sidebar-item" v-for="(story, name) in stories">
            <router-link class="level-up" :to="{name: 'view_story', params: {story_id: name}}">
                <i class="item-icon fa fa-level-up fa-flip-horizontal"></i>
            </router-link>
        </div>
    </nav>
</component>
