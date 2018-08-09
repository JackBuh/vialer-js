<component class="component-sidebar">
    <header class="sidebar-header">
        <div class="title">

        </div>
    </header>
    <nav class="sidebar-navigation">
        <header>Topics</header>
        <div class="sidebar-item" v-for="(story, name) in stories">
                {{name}}
        </div>
    </nav>
</component>
