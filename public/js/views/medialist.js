window.MediaListItemView = Backbone.View.extend({
    tagName: "tr",
    initialize: function () {
        this.model.bind("change",  this.render, this);
        this.model.bind("destroy", this.remove, this);
        this.model.bind("all", function (event) {console.log ('an item view got', event)}, this);
    },
    events: {
//        "click" : "onClick"
    },
    render: function () {
        console.log ("rendering item:", this.model);
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
    events: {
        "click    .editable-list-name"  : "editListName",
        "keyup    .editable-list-name"  : "showListNameEnter",
        "focusout .editable-list-name"  : "showListName",
    },
    get_collection: function () {
        return this.model.get('collection');
    },
    get_templateHTML: function () {
        return template.medialist(this.model.toJSON());
    },
    initialize: function () {
        console.log ("init...");

        var self = this;
        self.collection = this.get_collection();

        $(this.el).html(this.get_templateHTML());
        if (! this.options.dragSource) {
            self.prepareSortable($('.tbody', this.el));
        }

        new SearchView({el: $('#media-search', this.el),
                        collection: self.collection,
                        field  : 'file',
                        target : $('#table', this.el)});

        if (this.model && ! this.model.get('fixed'))
            $('.editable-list-name', this.el).tooltip();

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
                  'updateTotalTime',
                  'prepareSortable',
                  'editListName',
                  'showListName'
                 );

//        mediaList.bind('change', this.renderMe, this);
        self.collection.bind('add',   this.addOneAnim, this);
        self.collection.bind('reset', this.addAll, this);
        self.collection.bind('remove',this.checkEmpty, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('all',   this.updateTotalTime, this);
        self.collection.bind('update',this.update, this);

        this.addAll();
        this.updateTotalTime();
//        this.render();
    },
    editListName: function () {
        if (this.model && this.model.get('fixed'))
            return;
        if (this.editting)
            return;

        var h1 = $('.editable-list-name .fixed', this.el);
        var input = $('.editable-list-name .edit input',  this.el)[0]
        h1.hide();
        input.value = h1[0].textContent;
        input.focus();
        input.select();

        $('.editable-list-name .edit',  this.el).show();
        this.editting = true;
    },
    showListNameEnter: function (event) {
        if (event.which != 13) {
            return;
        }
        event.preventDefault();
        this.showListName();
    },
    showListName: function () {
        var h1 = $('.editable-list-name .fixed h1', this.el);
        var input = $('.editable-list-name .edit input',  this.el)[0]

        console.log ('about to save', this.model, input.value);

        this.model.set({name: input.value})

        h1[0].textContent = input.value;
        $('.editable-list-name .fixed', this.el).show();
        $('.editable-list-name .edit',  this.el).hide();

        this.editting = false;
    },
    prepareSortable: function (sort, connectedClass) {
        var self = this;
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
                $('.delete-drop').show()
            },
            stop: function (e, ui) {
                console.log ('stop');
                $('.delete-drop').hide()
                if (! self.nextDrop) /* we are dropping internally */
                    return;

                var drop = mediaList.get(self.nextDrop);
                $(ui.item).addClass("handleMe");

                _($(this).children()).each (function (order, index) {
                    if (order.classList.contains("handleMe")) {
                        if (self.collection.indexed_id)
                            self.collection.indexed_id (drop, index);
                        var item = self.collection.create (drop.attributes, {at: index, silent: true});
                        self.collection.add (item, {silent: true});

                        $(order).animate({
                            'opacity': 0,
                        }, 500, function () {
                            $(order).replaceWith(self.renderModel (item));
                        });
                    } else if (order.id == 'empty-alert') { /* placeholder */
                        $(order).animate({
                            'opacity': 0,
                        }, 500, function () {
                            $(order).remove();
                        });
                    }
                });
                self.nextDrop = false;
                console.log('col is now', self.collection.models);
                self.collection.trigger ('change');
            },
            /**
             * This is not ready. what we need to do is disable the add
             * event we get, but still handle re-order in the model, without
             * triggering a reset. all this while listening (and queuing)
             * other add events, (that may come from other sources
             **/
            receive: function( event, ui ) {
                console.log ('receive', $(ui), ui.sender[0].getAttribute('id'), this.lastDrop);
                self.nextDrop =  ui.sender[0].getAttribute('id');
            },
            update: function (e, ui) {
                var dragged_id = ui.item[0].id;
                _($(this).children()).each(function (order, index) {
                    var media = self.collection.get(order);
                    if (media && media.get(media.idAttribute) == dragged_id) {
                        var move = {id: dragged_id, from: media.get_index(), to: index}
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
    updateTotalTime: function () {
        var duration = arrayDuration (this.collection.pluck('durationraw'));
        $('.total-time', this.el)[0].textContent = prettyTime(duration);
        return duration;
    },
    update: function(){
        this.collection.sort()
    },
    renderModel: function (media) {
        var item = new MediaListItemView({model: media}).render().el;
        item.setAttribute ("id", media.get('_id'));

        if (this.options.dragSource) {
            $(item).draggable({//revert: true,
                               helper: 'clone',
                               cursorAt: { top: -5, left: -5 },
                               connectToSortable: ".recieve-drag",
                              });
        }
        return item;
    },
    addOne: function (media) {
        console.log ("adding: ", media.get('file'));
        var item = this.renderModel (media);
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
        console.log('addALL', this.el);
        if (this.checkEmpty())
            return

        this.$('#media-view', this.el).empty();
        this.collection.each(this.addOne);
        console.log('addALL -- end');
    },
    checkEmpty: function () {
        if (this.collection.length == 0) {
            this.$('#media-view', this.el).append(this.$('#empty-alert', this.el).clone());
            return true;
        }
        return false;
    },
    render: function () {
        console.log ("render...");

        return this;
    }
});
