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

var leadingZero = function(num){
    return (num < 10) ? "0"+num : num;
}

var toMili = function (time) {
    var t = time.match(/(\d{2}):(\d{2}):(\d{2})\.(\d*)/);
    t.shift();
    var n, m = parseInt(t.pop());
    var f = [24, 60, 60, 100];
    var F = 1;

    while (n = parseInt(t.pop())) {
        F = F * f.pop();
        m += n * F;
    }

    return m;
};
var prettyTime =  function (m) {
    var t = [];
    var f = [24, 60, 60, 100];

    while (F = f.pop()) {
        t.push(m - Math.floor(m/F)*F);
        m = Math.floor(m/F)
    }

    var mili = t.shift();
    t.reverse();
    t = _.map (t, function (e) {return leadingZero(e);});
    var s = t.join(':');
    return s +  '.' + mili.toString();
};

var findAndDo = function (what, where, how, work) {
    console.log (where);
    _(where).each(function (order, index) {
        console.log ("inside", order, 'index', index, where);
        var item = how(order);
        if (item && item.get(item.idAttribute) == what) {
            console.log ('found');
            return work (item, what, index);
        }
    });
};

window.MediaListView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        console.log ("init...");
/*
        var medias = this.collection.models;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});
        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
        $('#playbar', this.el).html(new PlayBarView({model : appModel}).render().el);
*/
        var self = this;
        $(this.el).html(template.medialist(this.collection.toJSON()));
        if (! this.options.dragSource) {
            self.prepareSortable();
        }

        window.socket.on('medias:moved', function (move) {
            self.moveDOM(move.id, move.from, move.to);
            self.collection.move(move.from, move.to);
        });

        _.bindAll(this, 'addOne', 'addOneAnim', 'addAll', 'updateTotalTime', 'prepareSortable');
//        mediaList.bind('change', this.renderMe, this);
        self.collection.bind('add',   this.addOneAnim, this);
        self.collection.bind('reset', this.addAll, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('all',   this.updateTotalTime, this);
        self.collection.bind('update',this.update, this);

        this.addAll();
//        this.render();
    },
    prepareSortable: function () {
        var self = this;
        $('.delete-drop', self.el).sortable({
            connectWith: '.connected-sortable',
            update : function (e, ui) {
                ui.item.remove();
            },
        }).hide();
        $('.tbody', this.el).addClass('recieve-drag').sortable({
            connectWith: '.connected-sortable',
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
                var item = self.collection.create(mediaList.get(self.nextDrop));
                $(ui.item).addClass("handleMe");
                console.log ("HERE DOC", $(ui.item), item);

                _($(this).children()).each (function (order, index) {
                    if (order.classList.contains("handleMe")) {
                        $(order).remove();
                        self.collection.add (item.attributes, {at: index});
                    } else if (order.id == 'kill-me') { /* placeholder */
                        $(order).remove();
                    }
                });
                console.log(self.collection.models);
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
                findAndDo (ui.item[0].id, $(this).sortable('toArray'),
                           function (order) { return self.collection.get(order)},
                           function (media, dragged_id, index) {
                               var move = {id: dragged_id, from: media.get('pos'), to: index}
                               console.log (move);
                               window.socket.emit('medias:moved', move);
                               self.collection.move(move.from, move.to);
                               self.updateTotalTime();
                               return;
                           });
            },
        });
    },
    updateTotalTime: function () {
        console.log ('update time', this.collection.pluck('duration'));
        var totalTime = _.reduce(this.collection.pluck('duration'), function (m, n) {
            console.log (n); return m + toMili(n);}, 0);
        $('.total-time', this.el)[0].textContent = prettyTime(totalTime);
        console.log ('Total Time: ', prettyTime(totalTime));
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
        console.log('addALL', this.el);
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
