window.ConfView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        this.render();
    },
    render: function () {
            $(this.el).html(template.confview({ config: this.model.toJSON(), defaults: this.options.modelDefault.toJSON() }));
            $('.bs-docs-sidenav').affix();
            $('body').scrollspy('refresh');
            return this;
    },
    events: {
        "change"        : "change",
        "click .save_conf"   : "save",
        "click .abort_conf"  : "abort",
        "click .set_default"    : "setDefault",
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
    setDefault: function(event) {
        var target = event.target;
        var res = target.name.split(".");
        if(res.length == 3) {
            this.model.attributes[res[0]][res[1]][res[2]] = this.options.modelDefault.attributes[res[0]][res[1]][res[2]];
            var selector = target.name.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\\$1');
            $('input#'+selector, this.el).val(this.model.attributes[res[0]][res[1]][res[2]]);
        }
        return false;
    },
});
