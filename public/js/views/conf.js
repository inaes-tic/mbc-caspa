window.ConfView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        this.render();
    },
    render: function () {
//        try {
            $(this.el).html(template.confview(this.model.toJSON()));
//            $(".bs-docs-sidebar").scrollspy();
            return this;
//        } catch (e) {
            utils.showAlert('Error', 'An error occurred while trying to change this item', 'alert-error');
            alert (e);
 //       }
    },
    events: {
        "change"        : "change",
        "click .save"   : "save",
        "click .abort"  : "abort",
    },
    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var change = {};
        change[target.name] = target.value;
        this.model.set(change);

        // Run validation rule (if any) on changed item
        var check = this.model.validateItem(target.id);
        if (check.isValid === false) {
            utils.addValidationError(target.id, check.message);
        } else {
            utils.removeValidationError(target.id);
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
