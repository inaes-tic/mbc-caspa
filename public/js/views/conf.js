window.ConfView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        this.render();
    },
    render: function () {
//        try {
            $(this.el).html(template.confview({ config: this.model.toJSON()}));
//            $(".bs-docs-sidebar").scrollspy();
            return this;
//        } catch (e) {
            utils.showAlert('Error', 'An error occurred while trying to change this item', 'alert-error');
            alert (e);
 //       }
    },
    events: {
        "change"        : "change",
        "click .save_conf"   : "save",
        "click .abort_conf"  : "abort",
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var res = target.name.split(".");
        switch(res.length) {
            case 1: this.model.attributes[target.name] = target.value; break;
            case 2: this.model.attributes[res[0]][res[1]] = target.value; break;
            case 3: this.model.attributes[res[0]][res[1]][res[2]] = target.value; break;
            default:
        }
    },
    abort: function () {
        app.navigate('/', false);
    },
    save: function () {
        var self = this;
        this.model.save(null, {
            success: function (model) {
                self.render();
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to change this item', 'alert-error');
            }
        });
    },
});
