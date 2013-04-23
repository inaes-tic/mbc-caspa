Backbone.io.connect();

Backbone.Collection.prototype.move = function (from, to) {
    console.log ('moving', from, to, this);
    if (! this.models[from] || ! this.models[to])
        return;

    var model = this.models[from].set_index(to, {silent: true});

    if (from < to) {
        for (var i = from; i < to; i++) {
            this.models[i] = this.models[i+1];
            this.models[i].set_index(i, {silent: true});
        }
    } else {
        for (var i = from; i > to; i--) {
            this.models[i] = this.models[i-1];
            this.models[i].set_index(i, {silent: true});
        }
    }

    this.models[to] = model;
    this.trigger('change:reorder');
    return model;
};
Backbone.View.prototype.moveDOM = function (id, from, to) {
    var jumper = $('#' + id) || console.trace ('ho noes');
    var dest = $('#' +this.collection.models[to].get_id());
    if (from < to) {
        jumper.insertAfter(dest);
    } else {
        jumper.insertBefore(dest);
    }
    return dest;
};

var DefaultConf = Backbone.Model.extend({
    backend: 'defaultsbackend',
    initialize: function () {
        if (!server) {
            this.bindBackend();
            this.bind('backend', function(method, model) {
                console.log ('got from backend:', method, model);
            });
            return Backbone.Model.prototype.initialize.call (this);
        }
    },
});
