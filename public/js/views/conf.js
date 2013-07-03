window.ConfView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        this.render();
        this.configModel  = this.collection.findWhere({ type: 'config' });
        this.defaultModel = this.collection.findWhere({ type: 'defaults' });
    },
    render: function () {
            $(this.el).removeClass("trans Pov").addClass("container-fluid no-Pov");
            $(this.el).html(template.confview({ config: this.collection.toJSON() }));
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

        var config_model = this.configModel.attributes;

        // Apply the change to the model
        var target = event.target;
        var res = target.name.split(".");
        /* XXX FIXME backbone problems setting with nested models. try backbone-deep-models? */
        switch(res.length) {
            case 1: config_model[target.name] = target.value; break;
            case 2: config_model[res[0]][res[1]] = target.value; break;
            case 3: config_model[res[0]][res[1]][res[2]] = target.value; break;
            default:
        }
    },
    abort: function () {
        app.navigate('/', false);
    },
    save: function () {
        var self = this;
        this.configModel.save(null, {
            success: function (model) {
                self.render();
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to change this item', 'alert-error');
            }
        });
    },
    setDefault: function(event) {
        var config_model = this.configModel.attributes;
        var default_model = this.defaultModel.attributes;
        var target = event.target;
        var res = target.name.split(".");
        if(res.length == 3) {
            config_model[res[0]][res[1]][res[2]] = default_model[res[0]][res[1]][res[2]];
            var selector = target.name.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\\$1');
            $('input#'+selector, this.el).val(default_model[res[0]][res[1]][res[2]]);
        }
        return false;
    }
});
