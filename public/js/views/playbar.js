window.PlayBarView = Backbone.View.extend({
    model : App.Model,
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
    btn_toggle: function (source) {
        $(source).addClass('disabled');
        $(this.last_pressed).removeClass('disabled');
        this.last_pressed = source;
    },
    back: function () {
        this.btn_toggle('#bck');
    },
    pause: function () {
        this.btn_toggle('#pause');
    },
    play: function () {
        this.btn_toggle('#play');
    },
    forward: function () {
        this.btn_toggle('#fwd');
    },
});
