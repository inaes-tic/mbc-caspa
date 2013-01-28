window.UniverseItemView = MediaListItemView.extend({
    tagName: "li",
    initialize: function () {
        MediaListItemView.prototype.initialize.call(this);
        this.collection = this.model.get('collection');
        this.model.bind("change", this.updateTotalTime, this);
    },
    render: function () {
        $(this.el).html(template.uniitem(this.model.toJSON()));
        this.updateTotalTime();
        return this;
    },
    updateTotalTime: function () {
        $('.total-time', this.el)[0].textContent = this.model.pretty_duration();
    },
});

window.UniverseListView = MediaListView.extend({
    el: $("#content"),
    get_templateHTML: function () {
        return template.universe();
    },
    get_collection: function () {
        return this.collection;
    },
    make_playlistview: function () {
        return new UniversePlayListView($.extend(this.options, {
            el: $('#playlists', this.el),
        }));
    },
    make_searchview: function () {
        return null;
    },
});

window.UniversePlayListView = MediaPlayListView.extend({
    el: $("#playlists"),
    get_collection: function () {
        return this.collection;
    },
    renderModel: function (list) {
        return new UniverseItemView({model: list}).render().el;
    },
});
