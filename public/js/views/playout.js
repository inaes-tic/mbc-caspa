window.PlayoutView = Backbone.View.extend({
    el: '#content',
    initialize: function() {
        var self = this;
        this.render();
        this.ratio = 25;
        
        var OccurrenceViewModel = function(model) {
            this.classes = 'well';
            this.start = kb.observable(model, 'start');
            this.end = kb.observable(model, 'end');
            this.title = kb.observable(model, 'title');
            this.height = ko.computed(function() {
                return (this.end() - this.start())/self.ratio + "px";
            }, this);
            this.list = Universe.get(model.get('list'));
        };
        var EmptySpace = function(start, end) {
            this.classes = 'alert alert-error';
            this.title = "";
            this.start = start;
            this.end = end;
            this.height = ko.computed(function() {
                return (this.end - this.start)/self.ratio + "px";
            }, this);
        };
        
        var ScheduleViewModel = function(collection) {
            this.occurs = ko.observableArray();
            for (i = 0; i < collection.length; i++) {
                var cur = collection.models[i];
                var next = collection.models[i+1];
                this.occurs.push(new OccurrenceViewModel(cur));
                if (next && cur.get('end') != next.get('start')) {
                    this.occurs.push(new EmptySpace(cur.get('end'), next.get('start')))
                };
            };
        };
        ko.applyBindings(new ScheduleViewModel(self.collection), this.$el[0]);
    },
    render: function() {
        this.$el.html(template.playout());
        return this;
    }
});