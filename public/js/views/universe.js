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
        console.log ('update time (item)',
                     this.collection.pluck('durationraw'),
                     this.model.get('duration')
                    );
        $('.total-time', this.el)[0].textContent = this.model.pretty_duration();
    },
});

window.UniverseListView = MediaListView.extend({
    el: $("#content"),
    initialize: function () {
        $(this.el).html(template.universe());
        self = this;
        _.bindAll(this,
                  'addOne',
                  'addOneAnim',
                  'addAll',
                  'checkEmpty',
                  'updateTotalTime'
                 );

        self.prepareSortable($('#playlists', this.el));

        self.collection.bind('add',   this.addOneAnim, this);
        self.collection.bind('reset', this.addAll, this);
        self.collection.bind('remove',this.checkEmpty, this);
        self.collection.bind('all',   function (e, a) {
            console.log('universe got: ', e, a, this);
        }, this);

        this.addAll();
    },
    renderModel: function (list) {
        var item = new UniverseItemView({model: list}).render().el;
        item.setAttribute ("id", list.get('_id'));

        return item;
    },
    addOne: function (list) {
        console.log ("adding: ", list.get('name'));
        var item = this.renderModel (list);
        this.$('#playlists', this.el).append(item);
    },
    addOneAnim: function (list) {
        this.addOne(list);

        // ooh, shiny animation!
        this.$('#' + list.id, this.el).css('opacity', 0);
        this.$('#' + list.id, this.el).animate({
            'opacity': 1,
        }, 2000);
    },
    addAll: function() {
        console.log('addALL', this.el);
        if (this.collection.length == 0) {
            console.log ('nuuuul', this.collection, this.collection.models, self.collection.length);
            this.$('#media-view', this.el).append(this.$('#empty-alert', this.el).clone());
            return
        }
        console.log (this.el, 'empty', this.collection.models);
        this.$('#playlists', this.el).empty();
        this.collection.each(this.addOne);
        console.log('addALL -- end');
    },
    checkEmpty: function () {
        if (this.collection.length == 0) {
            this.$('#media-view', this.el).append(this.$('#empty-alert', this.el).clone());
            return
        }
    },
});
