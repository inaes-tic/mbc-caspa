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
        console.log ("init...");
        var medias = this.collection.models;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});
        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
        $('#playbar', this.el).html(new PlayBarView({model : appModel}).render().el);

        var self = this;
        $(this.el).html(template.medialist(this.collection.toJSON()));
        if (! this.options.dragSource) {
            $('#drop-table', self.el).show().sortable({
                connectWith: '.connected-sortable',
                update: function (e, ui) {
                    ui.item[0].remove();
                }
            }).hide();
            $('.tbody', this.el).addClass('recieve-drag').sortable({
                connectWith: '.connected-sortable',
                helper: 'clone',
                forceHelperSize : true,
                forcePlaceholderSize : true,
                revert : true,
                start: function (e, ui) {
                    console.log ('start', self.el);
                    $('.delete-drop').show()
                    $('#drop-table', self.el).show().sortable("enable");
                },
                stop: function (e, ui) {
                    $('.delete-drop').hide()
                    $('#drop-table', self.el).hide().sortable("disable");
                },
                /**
                 * This is not ready. what we need to do is disable the add
                   event we get, but still handle re-order in the model,
                   without triggering a reset. all this while listening (and
                   queuing) other add events, (that may come from other
                   sources
                **/
                /*
                  receive: function( event, ui ) {
                  self.collection.add(mediaList.get(ui.draggable[0].id));
                  console.log ("DROP", event, ui, ui.draggable[0].id);
                  }});
                */

                update: function (e, ui) {
                    var dragged_id = ui.item[0].id;
                    _($(this).sortable('toArray')).each(function (order, index) {
                        var media = self.collection.get(order);
                        if (media && media.get('_id') == dragged_id) {
                            var move = {id: dragged_id, from: media.get('pos'), to: index}
                            window.socket.emit('medias:moved', move);
                            self.collection.move(move.from, move.to);
                            return;
                        }
                    });
                },
            });
        }

        window.socket.on('medias:moved', function (move) {
            self.moveDOM(move.id, move.from, move.to);
            self.collection.move(move.from, move.to);
        });

        _.bindAll(this, 'addOne', 'addOneAnim', 'addAll');
//        mediaList.bind('change', this.renderMe, this);
        self.collection.bind('add',   this.addOneAnim, this);
        self.collection.bind('reset', this.addAll, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('update',this.update, this);

        this.addAll();
//        this.render();
    },
    update: function(){
        this.collection.sort()
    },
    addOne: function (media) {
        console.log ("adding: ", media.get('file'));
        var item = new MediaListItemView({model: media}).render().el;
        item.setAttribute ("id", media.get('_id'));

        if (this.options.dragSource) {
            console.log (item, 'draggable');
            item.setAttribute ("class", item.getAttribute("class") + 'ui-sortable-helper');
            $(item).draggable({//revert: true,
                               helper: 'clone',
                               cursorAt: { top: -5, left: -5 },
                               connectToSortable: ".recieve-drag",
                              });
        }
        this.$('#media-view', this.el).append(item);
    },
    addOneAnim: function (media) {
        this.addOne(media);

        // ooh, shiny animation!
        this.$('#' + media.id, this.el).css('opacity', 0);
        this.$('#' + media.id, this.el).animate({
            'opacity': 1,
        }, 2000);
    },
    addAll: function() {
        console.log('addALL');
        if (this.collection.length > 0) {
            console.log (this.el, 'empty', this.collection.models);
            this.$('#media-view', this.el).empty();
        }
        this.collection.each(this.addOne);
        console.log('addALL -- end');
    },
    render: function () {
        console.log ("render...");

//        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});
