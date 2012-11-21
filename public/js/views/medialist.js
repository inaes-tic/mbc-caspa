
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
        $(this.el).html(template.medialist(this.model.toJSON()));
        $('.tbody', this.el).sortable({
            update: function (e, ui) {
                _($(this).sortable('toArray')).each(function (order, index) {
                    var media = mediaList.get(order);
                    console.log("update", order, media);
                    if (media.get('pos') != index) {
                        media.save({pos:index, notify:"others"});
                    }
                });
                // delay save() until we have all the pos set correctly
                //                mediaList.reset(mediaList.models)
            }
        });
//        mediaList.bind('change', this.renderMe, this);
        mediaList.bind('add',   this.addOneAnim, this);
        mediaList.bind('reset', this.addAll, this);
        mediaList.bind('all',   this.render, this);
        mediaList.bind('update',this.update, this);

        mediaList.fetch({success: function(collection, resp){
            collection.bindClient();
        }});
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
        console.log ("render");
        var medias = this.model.models;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});

        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
        $('#playbar', this.el).html(new PlayBarView({model : App.Model}).render().el);
//        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});
