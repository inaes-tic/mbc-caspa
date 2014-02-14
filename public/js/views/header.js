var uiUpdateInterval = 200;

window.SourceInfoView = Backbone.View.extend({
    el: $('.streams-to-air-block'),
    initialize: function () {
        $(this.el).html(template.sourceinfo(this.model.toJSON()));
    }
});

window.TimeInfoView = Backbone.View.extend({
    el: $('.time-info-block'),
    initialize: function () {
        $(this.el).html(template.timeinfo(this.model.toJSON()));
        var self = this;
        setInterval (function () {
            $('#time', this.$el).html(moment().format ('HH:mm:ss'));
        }, uiUpdateInterval);
    }
});

window.MostoMessagesViewModel = function(collection) {
    var self = this;

    this.radioValue = ko.observable("");

    this._collection = collection;

    this.collection = kb.collectionObservable(collection, {
        filters: function(model) {
            return model.get('type') === self.radioValue();
        }
    });

    //-----
    this.collectionNoFilter = kb.collectionObservable(collection);

    this.count = ko.computed(function() {
        return self.collectionNoFilter().length;
    });
    //-----

    this.countClass = ko.computed(function() {
        var class_ = 'notification';
        _.each(self.collectionNoFilter(), function(viewModel) {
            if (viewModel.model().isError()) {
                class_ = 'error';
            }
        });
        return class_;
    });

    this.allClass = ko.computed(function() {
        return self.radioValue() == '' ? 'all-enabled' : 'disabled';
    });

    this.notificationsClass = ko.computed(function() {
        return self.radioValue() == 'error' ? 'notifications-enabled' : 'disabled';
    });

    this.errorsClass = ko.computed(function() {
        return self.radioValue() == 'notification' ? 'errors-enabled' : 'disabled';
    });

    this.hasNotifications = ko.computed(function() {
        var found = false;
        _.each(self.collection(), function(viewModel) {
            if (viewModel.model().isNotification()) {
                found = true;
            }
        });
        return found;
    });

    this.remove = function(viewModel) { 
        var model = viewModel.model();
        this._collection.remove(model);
    };

    this.removeAll = function() {
        var models = $.extend({}, self._collection.models);
        _.each(models, function(model) {
            if (model.isNotification()) {
                self._collection.remove(model);
            }
        })
    };
}

window.mostoMessages = new App.MostoMessages([
    // for testing
    new App.MostoMessage({title: 'Title for notification', message: 'Text body notification text'}),
    new App.MostoMessage({title: 'Notification title', message: 'Sample notification text'}),
    new App.MostoMessage({title: 'Example error title', message: 'Description error sample', type: 'error'}),
    new App.MostoMessage({title: 'Sample notification', message: 'Text sample notification'})
]);

window.mostoMessagesViewModel = new MostoMessagesViewModel(mostoMessages);

// for testing
window.addMostoMessage = function(type) {
    mostoMessages.add(new App.MostoMessage({
        type: type,
        title: "Title for new " + type,
        message: "message at " + (new Date()).toLocaleString()}
    ));
};

// for testing
window.removeErrorMostoMessages = function() {
    var models = $.extend({}, mostoMessages.models);
    _.each(models, function(model) {
        if (model.isError()) {
            mostoMessages.remove(model);
        }
    });
};
//*/

window.HeaderView = function (options) {

    var self = this;

    self.appstatus = options['appstatus'];
    self.framestatus = options['framestatus'];

    self.el = 'el' in options ? options['el'] : $('#Panel');

    $(self.el).html(template.header());

    new SourceInfoView ({model: self.appstatus, el: $('.streams-to-air-block', self.$el)});
    new TimeInfoView   ({model: self.appstatus, el: $('.time-info-block', self.$el)});

    $('.now-playing-block', self.el).html(template.nowplaying({type: 'track'}));
    $('.show-block', self.el).html(template.nowplaying({type: 'Show'}));

    var HeaderViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
        }
    });

    var FrameViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;
            this.progress = ko.computed(function() {
                var p = 100 * this.currentFrame() / this.totalFrames();
                return p.toPrecision(3);
            }, self);
        }
    });

    self.view_model = {
        Header:new HeaderViewModel(self.appstatus),
        Frame: new FrameViewModel(self.framestatus),
        Messages: mostoMessagesViewModel,
    };

    ko.applyBindings(self.view_model, self.el[0]);

    self.selectMenuItem = function (menuItem) {
        $('#nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
        $('.btn-collapse').click()
    };

    var toggle = function(e) {
        var panel = self.el;
        var content = $('#content');

        // Make it smooth
        content.addClass("trans");

        if (panel.position().top != $(window).scrollTop()) {
            // Expanded header
            $("body").removeClass("folded");
        } else {
            // Compact header
            $("body").addClass("folded");
        };

        // Js Events
        $(window).resize();
    };
    $('#toggle-header').click(toggle);
    $('#mosto-messages label').on('click', function(e) { e.stopPropagation(); });
    $('#mosto-messages input').on('click', function(e) { e.stopPropagation(); });
    $('#mosto-messages a').on('click', function(e) { e.stopPropagation(); });

}

