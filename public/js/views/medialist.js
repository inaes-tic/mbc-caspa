
window.MediaListItemView = Backbone.View.extend({

    tagName: "tr",
    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.remove, this);
    },
    events: {
        "click" : "onClick"
    },
    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
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
        $(this.el).html(this.template());
        $('.tbody', this.el).sortable({
            update: function (e, ui) {
                _($(this).sortable('toArray')).each(function (order, index) {
                    var media = mediaList.get(order);
                    console.log("update", order, media);
                    if (media.get('pos') != index) {
                        media.save({pos:index});
                    }
                });
                // delay save() until we have all the pos set correctly
                //                mediaList.reset(mediaList.models)
            }
        });
//        mediaList.bind('change', this.renderMe, this);
        mediaList.bind('add',   this.addOne, this);
        mediaList.bind('reset', this.addAll, this);
        mediaList.bind('all',   this.render, this);

        mediaList.fetch();
    },
    renderMe: function(){
        mediaList.fetch();
        console.log("renderMe ",  _.flatten(mediaList.pluck('file')) ,  _.flatten(mediaList.pluck('pos')));
        this.render();
    },
    addOne: function (media) {
        var item = new MediaListItemView({model: media}).render().el;
        item.setAttribute ("id", media.get('_id'));

        console.log('adding', media, item);

        this.$('#media-view').append(item);
    },
    addAll: function() {
        mediaList.each(this.addOne);
    },
    render: function () {
        console.log ("render");
        var medias = this.model.models;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});

        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
//        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});
