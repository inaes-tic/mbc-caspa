window.MediaListItemView = Backbone.View.extend({
    tagName: "tr",
    initialize: function () {
        this.model.bind("change",  this.render, this);
        this.model.bind("destroy", this.remove, this);
        this.model.bind("all", function (event, arg) {
            console.log ('an item view got', event, arg)}, this);
    },
    events: {
//        "click" : "onClick"
    },
    render: function () {
        var self = this;
        console.log ("rendering item:", this.model);
        $(this.$el).html(template.item(this.model.toJSON()));
        return this;
    },
    onClick: function () {
//        $('.media-name', this.$el).click();
        console.log($('a', this.$el));

    },
   // Remove this view from the DOM.
   remove: function() {
     $(this.$el).remove();
   },

   // Remove the item, destroy the model.
   clear: function() {
     this.model.destroy();
   }

});

window.MediaListView = Backbone.View.extend({
    el: $('#content'),
    defaults: {
        sortable:  true,
        draggable: false,
    },
    events: {
        "click    .editable-list-name"  : "editListName",
        "keyup    .editable-list-name"  : "saveListNameEnter",
        "focusout .editable-list-name"  : "saveListName",
    },
    get_collection: function () {
        return this.model.get('collection');
    },
    get_templateHTML: function () {
        return template.medialist(this.model.toJSON());
    },
    make_playlistview: function (opts) {
        var view = new MediaPlayListView($.extend(this.options, {
            el: $('#media-view', this.$el),
            model:      this.model,
        }));

        if (this.model && ! this.model.get('fixed'))
            $('.editable-list-name', this.$el).tooltip();

        return view;
    },
    make_searchview: function (opts){
        return new SearchView({
            el: $('#media-search', this.$el),
            collection: self.collection,
            field  : 'file',
            target : $('#table', this.$el)
        });
    },
    initialize: function () {
        console.log ("init...");

        var self = this;
        self.collection = this.get_collection();

        $(this.$el).html(this.get_templateHTML());

        this.make_playlistview();
        this.make_searchview();

        _.bindAll(this,
                  'editListName',
                  'saveListName',
                  'updateTotalTime'
                 );

        self.collection.bind('all',   this.updateTotalTime, this);
        if (this.render)
            this.render();
    },
    editListName: function () {
        if (this.model && this.model.get('fixed'))
            return;
        if (this.editting)
            return;

        var h1 = $('.editable-list-name .fixed', this.$el);
        var input = $('.editable-list-name .edit input',  this.$el)[0]
        h1.hide();
        input.value = h1[0].textContent;
        input.focus();
        input.select();

        $('.editable-list-name .edit',  this.$el).show();
        this.editting = true;
    },
    saveListNameEnter: function (event) {
        if (event.which != 13) {
            return;
        }
        event.preventDefault();
        this.saveListName();
    },
    saveListName: function () {
        if (! this.editting)
            return;
        var h1 = $('.editable-list-name .fixed h1', this.$el);
        var input = $('.editable-list-name .edit input',  this.$el)[0]

        console.log ('about to save', this.model, input.value);

        this.model.save({name: input.value})

        h1[0].textContent = input.value;
        $('.editable-list-name .fixed', this.$el).show();
        $('.editable-list-name .edit',  this.$el).hide();

        this.editting = false;
    },
    updateTotalTime: function () {
        var duration = arrayDuration (this.collection.pluck('durationraw'));
        $('.total-time', this.$el)[0].textContent = prettyTime(duration);
        return duration;
    },
})

window.MediaPlayListView = MediaListView.extend({
    el: $("#media-view"),
    initialize: function () {
        var self = this;

        this.collection = this.get_collection();

        if (this.options.sortable) {
            console.log("this is sortable", this);
            this.prepareSortable(this.$el);
        }

        function assert (exp) {
            if (!exp)
                console.error ("ASSERT FAILED:", exp);
        }

        assert(this.collection);

        window.socket.on(self.collection.url + ':moved', function (move) {
            self.moveDOM(move.id, move.from, move.to);
            self.collection.move(move.from, move.to);
        });

        _.bindAll(this,
                  'renderModel',
                  'addOne',
                  'addOneAnim',
                  'addAll',
                  'checkEmpty',
                  'prepareSortable'
                 );

//        mediaList.bind('change', this.renderMe, this);
        self.collection.bind('add',   this.addOneAnim, this);
        self.collection.bind('reset', this.addAll, this);
        self.collection.bind('remove',this.checkEmpty, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('update',this.update, this);

        this.addAll();
        if (this.render)
            this.render();
    },
    prepareSortable: function (sort, connectedClass) {
        var self = this;
        console.log ('making', sort, 'sortable');
        var coClass = connectedClass || '.connected-sortable';
        $('.delete-drop').sortable({
            connectWith: coClass,
            update : function (e, ui) {
                self.collection.remove (self.collection.get(ui.item[0].id));
                ui.item.remove();
                console.log (self.collection.pluck('file'));
            },
        }).hide();
        sort.addClass('recieve-drag').sortable({
            connectWith: coClass,
            helper: 'clone',
            forceHelperSize : true,
            forcePlaceholderSize : true,
            revert : true,
            cancel: ".no-sort",
            start: function (e, ui) {
                /**
                 * HUGE HACK: we only get this set when the helper
                 * comes from a draggable, this allows us to make a
                 * difference, to show or not the 'delete' div based on
                 * weather we come from our sortable (i.e. this), or
                 * from somewhere else (i.e. the other pane)
                 */
                console.log ('start');
                if (ui.helper[0].className.match('ui-draggable-dragging'))
                    return;

                $('.delete-drop').show().animate({
                    'height': '20%',
                }, 500);
            },
            stop: function () {
                $('.delete-drop').animate({
                    'height': 0,
                }, 500, function () {$('.delete-drop').hide()});
            },
            /**
             * This is not ready. what we need to do is disable the add
             * event we get, but still handle re-order in the model, without
             * triggering a reset. all this while listening (and queuing)
             * other add events, (that may come from other sources)
             **/
            receive: function( event, ui ) {
                console.log ('receivette', $(ui), ui.item[0].id, this.nextDrop, self);
                self.lastDrop = self.nextDrop =  ui.item[0].id;
                console.log ("last drop:", self.lastDrop);

                var drop = mediaList.get(self.nextDrop);

                _($(this).children()).each (function (order, index) {
                    console.log('looking at', order, index);
                    if (order.classList.contains("ui-draggable")) {
                        var item = self.collection.create (drop.attributes, {at: index});
                        console.log ('item is:', item);
                        $(order).animate({
                            'opacity': 0,
                        }, 500, function () {
                            $(order).replaceWith(self.renderModel (item));
                        });
                    } else if (order.id == 'empty-alert') { /* placeholder */
                        console.log('removing empty');
                        $(order).animate({
                            'opacity': 0,
                        }, 500, function () {
                            $(order).remove();
                        });
                    }
                });
                self.nextDrop = false;
                console.log('col is now', self.collection.models);
//                self.checkEmpty();
            },
            update: function (e, ui) {
                var dragged_id = ui.item[0].id;
                _($(this).children()).each(function (order, index) {
                    var media = self.collection.get(order);
                    if (media && media.get(media.idAttribute) == dragged_id) {
                        var move = {id: dragged_id, from: media.get('pos'), to: index}
                        console.log ("moving", self.collection.url + ':moved', move, media);
                        window.socket.emit(self.collection.url + ':moved', move);
                        self.collection.move(move.from, move.to);
                        self.collection.trigger('change');
                        return;
                    }
                });
            },
        });
    },
    update: function(){
        this.collection.sort()
    },
    renderModel: function (media) {
        return new MediaListItemView({model: media}).render().el;
    },
    addOne: function (media) {
        if (media.id == this.lastDrop) {
            console.log ('already have: it');
            this.lastDrop = false;
            return false;
        }

        console.log ("adding: ", media.id, this.lastDrop, media.get('name'), this.$el);
        var item = this.renderModel (media);
        item.setAttribute ("id", media.get('_id'));

        if (this.options.draggable) {
            $(item).draggable({//revert: true,
                helper: 'clone',
                cursorAt: { top: 5, left: 5 },
                zIndex: 900,
                connectToSortable: ".recieve-drag",
            });
        }

        this.$el.append(item);
    },
    addOneAnim: function (media) {
        if (! this.addOne(media))
            return;

        // ooh, shiny animation!
        this.$('#' + media.id, this.$el).css('opacity', 0);
        this.$('#' + media.id, this.$el).animate({
            'opacity': 1,
        }, 2000);
    },
    addAll: function() {
        console.log('addALL', this.$el);
        if (this.checkEmpty())
            return

        this.collection.each(this.addOne);
        console.log('addALL -- end');
    },
    checkEmpty: function () {
        console.log ('checking for empty');
        if (! this.collection.length) {
            this.$el.append(template.emptyalert());
            return true;
        }
        this.$el.empty();
        return false;
    },
    render: function () {
        console.log ("render...");

        return this;
    }
});
