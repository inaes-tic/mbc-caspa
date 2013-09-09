window.MasterView = Backbone.View.extend({
    el: "#content",

    genericEvents: {},

    initialize: function() {
        var self = this;

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
});
