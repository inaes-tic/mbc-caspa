window.MediaListItemView = Backbone.View.extend({
    tagName: "tr",
    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.remove, this);
    },
    events: {
//        "click" : "onClick"
    },
    render: function () {
        $(this.el).html(template.item(this.model.toJSON()));
        return this;
    },
    onClick: function () {
//        $('.media-name', this.el).click();
        console.log($('a', this.el));

    },
   // Remove this view from the DOM.
   remove: function() {
     $(this.el).remove();
   },

   // Remove the item, destroy the model.
   clear: function() {
     this.model.destroy();
   }

});

window.MediaListView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        var self = this;
        $(this.el).html(template.medialist(this.collection.toJSON()));
        $('.tbody', this.el).sortable({
            update: function (e, ui) {
                var dragged_id = ui.item[0].id;
                _($(this).sortable('toArray')).each(function (order, index) {
                    var media = mediaList.get(order);
                    if (media.get('_id') == dragged_id) {
                        var move = {id: dragged_id, from: media.get('pos'), to: index}
                        window.socket.emit('medias:moved', move);
                        mediaList.move(move.from, move.to);
                        return;
                    }
                });
            },
            forceHelperSize : true,
            forcePlaceholderSize : true,
            revert : true
        });

        window.socket.on('medias:moved', function (move) {
            self.moveDOM(move.id, move.from, move.to);
            mediaList.move(move.from, move.to);
        });

//        mediaList.bind('change', this.renderMe, this);
        mediaList.bind('add',   this.addOneAnim, this);
        mediaList.bind('reset', this.addAll, this);
        mediaList.bind('all',   this.render, this);
        mediaList.bind('update',this.update, this);

        this.addAll();
//        this.render();
    },
    update: function(){
        mediaList.sort()
    },
    addOne: function (media) {
        var item = new MediaListItemView({model: media}).render().el;
        item.setAttribute ("id", media.get('_id'));
        this.$('#media-view').append(item);
    },
    addOneAnim: function (media) {
        this.addOne(media);

        // ooh, shiny animation!
        this.$('#' + media.id).css('opacity', 0);
        this.$('#' + media.id).animate({
            'opacity': 1,
        }, 2000);
    },
    addAll: function() {
        this.$('#media-view').empty();
        mediaList.each(this.addOne);
    },
    render: function () {
        var medias = this.collection.models;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});

        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
        $('#playbar', this.el).html(new PlayBarView({model : appModel}).render().el);
//        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});
