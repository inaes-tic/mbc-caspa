window.PlayBarView = Backbone.View.extend({
    initialize: function () {
        this.render();
        this.last_pressed = "";
    },
    render: function () {
        $(this.el).html(template.playbar());
        return this;
    },
    events: {
        "change"        : "change",
        "click #bck"    : "back",
        "click #pause"  : "pause",
        "click #play"   : "play",
        "click #fwd"    : "forward",
    },

    change: function (event) {
        // Remove any existing alert message
        utils.showAlert('Success!', 'button changed ?', 'alert-success');
    },
    set_state: function (state) {
        var state_name = this.model.get('state_name');
        if (! state_name.indexOf(state))
            return console.log ("error: invalid state:" + state);
        this.model.save({state: state_name.indexOf(state)});
    },
    btn_toggle: function (source) {
        $(source).addClass('disabled');
        $(this.last_pressed).removeClass('disabled');
        this.last_pressed = source;
    },
    back: function () {

    },
    pause: function () {
        this.btn_toggle('#pause');
        this.set_state ('PAUSED');
    },
    play: function () {
        this.btn_toggle('#play');
        this.set_state ('PLAYING');
    },
    forward: function () {
    },
});
