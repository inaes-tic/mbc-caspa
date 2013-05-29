window.PlayoutView = Backbone.View.extend({
    el: '#content',
    initialize: function() {
        var self = this;
        this.ratio = 25;
        this.$el.html(template.playout());

        var OccurrenceViewModel = function(model) {
            this.cid = model.cid;
            this.classes = 'well';
            this.start = kb.observable(model, 'start');
            this.end = kb.observable(model, 'end');
            this.title = kb.observable(model, 'title');
            this.height = ko.computed(function() {
                return (this.end() - this.start()) / self.ratio + "px";
            }, this);
            this.model = model;
            this.list = Universe.get(model.get('list'));
        };
        var EmptySpace = function(start, end, cid) {
            this.classes = 'well alert-error';
            this.title = function() {return ""};
            this.start = start;
            this.end = end;
            this.cid = cid;
            this.height = ko.computed(function() {
                return (this.end - this.start) / self.ratio + "px";
            }, this);
        };

        var ScheduleViewModel = function(collection) {
            this.occurs = ko.observableArray();
            this.update(collection);
        };

        ScheduleViewModel.prototype.update = function(collection) {
            var self = this;
            self.occurs.removeAll();
            for (i = 0; i < collection.length; i++) {
                var cur = collection.models[i];
                var next = collection.models[i+1];
                self.occurs.push(new OccurrenceViewModel(cur));
                if (next && cur.get('end') != next.get('start')) {
                    self.occurs.push(new EmptySpace(cur.get('end'), next.get('start'), cur.cid + "-" + next.cid))
                };
            }

            var new_data = d3.select("#playout ul").selectAll("li")
                .data(self.occurs(), function(d, i) { return d.cid || "es" + i; });

            new_data.enter().insert("li", function(d, i) { return $(this).children()[i]; })
                .style("overflow", "hidden")
                .style("height", "0px")
                .style("padding-left", "19px", "important")
                .style("padding-right", "19px", "important")
                .style("padding-top", "0px")
                .style("padding-bottom", "0px")
                .style("margin-left", "5px", "important")
                .style("margin-right", "5px", "important")
                .style("margin-top", "0px")
                .style("margin-bottom", "0px")
                .style("min-height", "0px");

            new_data
                .text(function(d) {return d.title()})
                .property("className", function(d) {return d.classes})
                .on("click", function(d) {
                    if (confirm("Delete?")) {
                        d.model.destroy();
                    }
                })
                .transition()
                    .delay(function(d, i) {i * 100})
                    .duration(1000)
                    .style("height", function(d) {return d.height()})
                    .style("padding", "19px")
                    .style("margin", "5px")
                    .style("min-height", "19px");

            new_data.exit()
                .style("overflow", "hidden")
                .style("min-height", "0px")
                .style("padding", "19px")
                .style("margin", "5px")
                .transition()
                    .duration(1000)
                    .style("height", "0px")
                    .style("padding-top", "0px")
                    .style("padding-bottom", "0px")
                    .style("margin-top", "0px")
                    .style("margin-bottom", "0px")
                .remove();

        };


        this.view_model = new ScheduleViewModel(self.collection);

        self.collection.bind('add reset remove change', function() {
            self.view_model.update(self.collection);
        }, this);

        self.collection.bind('all', function (e, a) {
            console.log("PlayoutView > event:" + e + " > ", a);
        }, this);

        //ko.applyBindings(this.view_model, this.el);
    },
});
