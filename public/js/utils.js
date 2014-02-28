window.utils = {

    // Asynchronously load templates located in separate .html files
    loadTemplate: function(views, callback) {

        var deferreds = [];

        $.each(views, function(index, view) {
            if (window[view]) {
                deferreds.push($.get('templates/' + view + '.html', function(data) {
                    window[view].prototype.template = _.template(data);
                }));
            } else {
                alert(view + " not found");
            }
        });

        $.when.apply(null, deferreds).done(callback);
    },

    displayValidationErrors: function (messages) {
        for (var key in messages) {
            if (messages.hasOwnProperty(key)) {
                this.addValidationError(key, messages[key]);
            }
        }
        this.showAlert('Warning!', 'Fix validation errors and try again', 'alert-warning');
    },

    addValidationError: function (field, message) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.addClass('error');
        $('.help-inline', controlGroup).html(message);
    },

    removeValidationError: function (field) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.removeClass('error');
        $('.help-inline', controlGroup).html('');
    },

    showAlert: function(title, text, klass) {
        $('.alert').removeClass("alert-error alert-warning alert-success alert-info");
        $('.alert').addClass(klass);
        $('.alert').html('<strong>' + title + '</strong> ' + text);
        $('.alert').show();
    },

    hideAlert: function() {
        $('.alert').hide();
    },

    color_scale: d3.scale.category10(),

    deep: function(obj, path) {
        for (var i = 0, path = path.split("."), len = path.length; i < len; i++) {
            obj = obj[path[i]];
        }
        return obj;
    },
};

window.utils.StateTracker = function() {
    var self = this;
    _.extend(self, Backbone.Events);

    self.model = null;
    self.model_state = null;
    self.model_attrs = null;

    self._onBackend = function(method, obj) {
        if (obj._id != self.model.get('_id')) {
            return;
        }

        if (method && method == 'delete') {
            self.trigger('deleted', self.model);
            self.untrackModel();
            return;
        }

        if (self.commitChanges()) {
            self.trigger('changed', self.model);
        }
    };

    self._onSync = function() {
        self.commitChanges();
    };

    self.commitChanges = function() {
        if (!self.model) {
            return false;
        }
        self.model.memento.commit();
        self.model.memento.store();
        return true;
    };

    self.trackModel = function(model) {
        if (!model) {
            return;
        }

        if (model === self.model) {
            return;
        }

        model.memento = model.memento || new Backbone.Memento(model, {ignore: ['memento']});

        self.untrackModel();
        model.memento.store();

        model.on('backend', self._onBackend);
        model.on('sync', self._onSync);

        self.model = model;

    };

    self.untrackModel = function(model) {
        if (!self.model) {
            return;
        }

        self.model.memento.restart();
        self.model.off('backend', self._onBackend);
        self.model.off('sync', self._onSync);

        self.model = null;
        self.model_state = null;
        self.model_attrs = null;
    };

    self.enterView = function() {
        if (!self.model) {
            return {changed:false, model:null};
        }

        self.commitChanges();

        var changed = !_.isEqual(JSON.parse(JSON.stringify(self.model.attributes)), self.model_attrs);
        if (!changed) {
            self.model_state.restart();
        } else {
            self.trigger('changed', self.model);
        }

        self.model.on('backend', self._onBackend);
        self.model.on('sync', self._onSync);

        return {model: self.model, changed: changed};
    };

    self.leaveView = function() {
        if (!self.model) {
            return;
        }
        /*
         * XXX: This is ugly as h*ll but backbone-relational ignores the related models
         * if they do not have an id when restoring (one or more of them have a null id,
         * how are we supposed to make sense of a relationship then?)
         */
        if (self.model.getRelations) {
            _.each(self.model.getRelations(), function(relation) {
                var relateds = self.model.get(relation.key);
                if (!relateds) {
                    return
                }
                relateds.each(function(ob) {
                    if (ob.get('_id') === undefined) {
                        ob.set('_id', uuid.v4());
                        ob.set('_tmpid', true);
                    }
                });
            });
        }

        self.model_state = new Backbone.Memento(self.model, {ignore: ['memento']});
        self.model_state.store();

        self.model.memento.restart();

        // kind of a deep clone. If we do not this inner elements are just copied by reference
        // and so when the original changes our copy does too, making future comparisons useless.
        self.model_attrs = JSON.parse( JSON.stringify(self.model.attributes) );

        self.model.off('backend', self._onBackend);
        self.model.off('sync', self._onSync);

        self.off('changed');
        self.off('deleted');
    };
};
