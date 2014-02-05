window.MasterView = Backbone.View.extend({
    el: "#content",

    genericEvents: {},

    initialize: function() {
        var self = this;

        _.extend(this, Backbone.Events);

        // This allows us to hook before and after rendering happens.
        // XXX: keep the _.bindAll, otherwise 'this' will point to the
        // global object inside render()
        _.bindAll(this, 'render');
        this.render = _.wrap(this.render, function(render) {
                this.trigger('prerender');
                render();
                this.trigger('postrender');
        });

        // This allows the view to be extended without losing bindings
        this.events = _.extend({}, this.events, this.genericEvents);
        this.delegateEvents();
    },

    render: function() {
        var self = this;

        // Navigate alert
        this.alert_dialog = this.$el.find("#alert-save").dialog({
            autoOpen: false,
            draggable: false,
            modal: true,
            resizable: false,
            width: "auto",
            buttons: {
                "Close": function() {
                    self.alert_dialog.dialog("close");
                },
            },
        });
    },

    destroyView: function() {
        this.undelegateEvents();
    },
});
