
function PlayoutTimeline(config) {
    this.init.call(this, config);
}

PlayoutTimeline.prototype = {
    init: function(config) {
        var self = this;
        self.config = config;

        self.width = config.width;
        self.height = config.height;
        self.layout = config.layout;

        self.unique_id = config.unique_id;

        // Select container from config
        self.container = d3.select(config.container);
        if (self.container.empty()) {
            throw new Error("Timeline: No container");
        }

        // Select or insert svg object
        self.svg = self.container.select("svg");
        if (self.svg.empty()) {
            self.svg = self.container.append("svg:svg")
                .attr("height", self.height)
                .attr("width", self.width)
        }

        // Shades
        self.configure_shades();

        // Insert panels
        self.panels = [];
        var total_span = config.panels.reduce(function(prev, elem) {
            return prev + elem.span;
        }, 0);
        var actual_span = 0;
        for (var i = 0, li = config.panels.length; i < li; ++i) {
            config.panels[i].total_span = total_span;
            config.panels[i].actual_span = actual_span;
            config.panels[i].panel = i;
            if (i < li - 1) {
                config.panels[i].highlight = config.panels[i+1].axis.span;
            }
            self.panels.push(new PlayoutTimelinePanel(this, config.panels[i]));
            actual_span += config.panels[i].span;
        }

        // Configure timer for now indicator
        self.draw_now_indicator();
        window.setInterval(function() {
            var now = self.draw_now_indicator.call(self);
            if (self.config.follow) {
                self.pan.call(self, moment.duration(self.panels[self.panels.length - 1].start.diff(now) + self.panels[self.panels.length - 1].axis_span.asMilliseconds() / 2));
            }
        }, 200);

    },

    panTime: function(time, smooth) {
        var self = this;
        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].panTime(time, smooth);
        }
    },

    centerTime: function(time, smooth) {
        var self = this;
        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].centerTime(time, smooth);
        }
    },

    draw_now_indicator: function(now) {
        var self = this;

        var now = moment();
        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].draw_now_indicator(now);
        }

        return now;
    },

    configure_events: function() {
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            this.panels[i].configure_events();
        }
    },

    release_events: function() {
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            this.panels[i].release_events();
        }
    },

    draw_highlights: function(smooth) {
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            if (i + 1 < li) {
                this.panels[i].draw_highlight(this.panels[i + 1].axis_span, smooth);
            }
        }
    },

    focus_playlist: function(playlist) {
        var self = this;

        // Do not center if following
        if (self.config.follow) {
            return;
        }

        var center = self.get_playlist_central_time(playlist);

        for (var i = 0, li = self.panels.length; i < li; ++i) {
            var panel = self.panels[i];
            var callback;
            if (panel.config.zoomable) {
                callback = _.bind(panel.zoom_playlist, panel, playlist, true);
            }
            panel.centerTime(center, true, callback);
        }
    },

    get_playlist_central_time: function(playlist) {
        var start = moment.unix(playlist.get("start"));
        var diff = start.diff(moment.unix(playlist.get("end")));
        return start.subtract("milliseconds", diff / 2);
    },

    configure_shades: function() {
        var self = this;

        var gross_v = self.svg
            .append("linearGradient")
            .attr("id", "grossFadeToBlack_v")
            .attr("x2", 0)
            .attr("y2", 1);

        var gross_h = self.svg
            .append("linearGradient")
            .attr("id", "grossFadeToBlack_h")
            .attr("x1", 1)
            .attr("x2", 0);

        var thin_h1 = self.svg
            .append("linearGradient")
            .attr("id", "thinFadeToBlack_h1");

        var thin_h2 = self.svg
            .append("linearGradient")
            .attr("id", "thinFadeToBlack_h2")
            .attr("x1", 1)
            .attr("x2", 0);

        var thin_v1 = self.svg
            .append("linearGradient")
            .attr("id", "thinFadeToBlack_v1")
            .attr("x2", 0)
            .attr("y2", 1);

        var thin_v2 = self.svg
            .append("linearGradient")
            .attr("id", "thinFadeToBlack_v2")
            .attr("x2", 0)
            .attr("y2", 0)
            .attr("y1", 1);

        var gross_stops = [[0, 0.4], [0.1, 0.1], [0.5, 0], [0.9, 0.1], [1, 0.4]];
        for (var i = 0, li = gross_stops.length; i < li; ++i) {
            gross_v.append("stop")
                .attr("offset", gross_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", gross_stops[i][1]);
            gross_h.append("stop")
                .attr("offset", gross_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", gross_stops[i][1]);
        }

        var thin_stops = [[0, 0.4], [1, 0]];
        for (var i = 0, li = thin_stops.length; i < li; ++i) {
            thin_h1.append("stop")
                .attr("offset", thin_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", thin_stops[i][1]);
            thin_h2.append("stop")
                .attr("offset", thin_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", thin_stops[i][1]);
            thin_v1.append("stop")
                .attr("offset", thin_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", thin_stops[i][1]);
            thin_v2.append("stop")
                .attr("offset", thin_stops[i][0])
                .attr("stop-color", "#000")
                .attr("stop-opacity", thin_stops[i][1]);
        }
    },
};

PlayoutTimeline.HORIZONTAL = 0;
PlayoutTimeline.VERTICAL = 1;

PlayoutTimelinePanel = function() {
    this.init.apply(this, arguments);
};

PlayoutTimelinePanel.prototype = {
    init: function(timeline, config) {
        var self = this;

        self.timeline = timeline;
        self.config = config;
        self.data = [];

        self.scale_factor = 1;
        self.translate = 0;

        // Adjust metrics to layout
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                self.height = Math.floor(config.span / config.total_span * self.timeline.height);
                self.width = self.timeline.width - 0.5;
                self.x = 0.5;
                self.y = self.timeline.height - Math.floor(config.actual_span / config.total_span * self.timeline.height) - self.height + 0.5;

                self.padding = [0, 0, 0, 35];
                self.orient = "bottom";
                self.drawing_width = self.width - self.padding[2];
                self.drawing_height = self.height - self.padding[3];

                self.rect_adjust = [0.5, 1, -0.5, -1];
                self.axis_adjust = [self.padding[0] + 0.5, (self.height - self.padding[3])];
            break;
            case PlayoutTimeline.VERTICAL:
                self.height = self.timeline.height;
                self.width = Math.floor(config.span / config.total_span * self.timeline.width);
                self.x = Math.floor(config.actual_span / config.total_span * self.timeline.width) - 0.5;
                self.y = -0.5;

                self.padding = [65, 0, 65, 0];
                self.orient = "left";
                self.drawing_width = self.height - self.padding[3];
                self.drawing_height = self.width - self.padding[2];

                self.rect_adjust = [0, 0.5, 0, -0.5];
                self.axis_adjust = [self.padding[0], self.padding[1] + 0.5];
            break;
        }

        // Setup svg panel
        self.svg = self.timeline.svg.append("svg");
        self.svg
            .attr("x", self.x)
            .attr("y", self.y)
            .attr("width", self.width)
            .attr("height", self.height)
            .on("dblclick.zoom", null);

        // Add transparent background (for clicking purposes)
        self.make_fully_clickable();

        // Draw gray background
        self.draw_background();

        // Setup visualization
        self.vis = self.svg.append("svg:g")
            .attr("transform", "translate(" + self.padding[0] + "," + self.padding[1] + ")");

        // Configure zooming events
        self.zoom_obj = d3.behavior.zoom();
        if (!config.zoomable) {
            self.zoom_obj.scaleExtent([1, 1]);
        }
        if (!self.timeline.config.follow) {
            self.configure_events();
        }

        // Setup Axis
        self.axis_span = config.axis.span;
        self.orig_axis_span = config.axis.span;
        self.start = moment().subtract("milliseconds", self.axis_span.asMilliseconds() / 2);
        self.end = moment(self.start).add(self.axis_span);

        self.time_scale = d3.time.scale()
            .range([0, self.drawing_width - 1])
            .domain([self.start, self.end]);
        self.axis = d3.svg.axis()
            .scale(self.time_scale)
            .orient(self.orient)
            .tickSubdivide(1)
            .tickSize(-self.drawing_height, 6, -self.drawing_height)

        if (config.axis.ticks !== undefined) {
            self.axis.ticks(config.axis.ticks);
        }

        self.g_axis = self.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + self.axis_adjust[0] + "," + self.axis_adjust[1] + ")");
        self.g_axis.call(self.axis);

        // Add highlight
        if (config.highlight) {
            self.draw_highlight(config.highlight);
        }

        // Draw Shades
        self.draw_shade();

        // Draw graphic border
        self.draw_border();
    },

    draw_highlight: function(time_span, smooth) {
        var self = this;

        var hl_span = self.timeToPixels(time_span);

        // Adjust metrics to layout
        var hl_metrics;
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                hl_metrics = [Math.floor(self.drawing_width / 2 - hl_span / 2), 0, Math.floor(hl_span), self.height - self.padding[3]];
            break;
            case PlayoutTimeline.VERTICAL:
                hl_metrics = [0 + self.padding[0], Math.floor(self.drawing_width / 2 - hl_span / 2), self.width - self.padding[2], Math.floor(hl_span)];
            break;
        }

        // Select or insert highlight element
        var hl = self.svg.select("rect.highlight");
        if (hl.empty()) {
            hl = self.svg.append("rect");
        }

        // Smooth if required
        if (smooth) {
            hl = hl.transition().duration(500);
        }

        hl
            .attr("class", "highlight")
            .attr("x", hl_metrics[0])
            .attr("y", hl_metrics[1])
            .attr("width", hl_metrics[2])
            .attr("height", hl_metrics[3])
            .style("pointer-events", "none");
    },

    configure_events: function() {
        var self = this;

        self.zoom_obj.on("zoom", _.bind(self.handlePanningEvent, self));
        self.svg.call(self.zoom_obj);

        if (self.config.zoomable) {
            self.svg.on("mousewheel.zoom", _.bind(self.handleMouseWheel, self));
        } else {
            self.svg.on("mousewheel.zoom", null);
        }
    },

    release_events: function() {
        this.svg
            .on("mousedown.zoom", null)
            .on("mousewheel.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null);
    },

    make_fully_clickable: function() {
        // TODO: is there a better way?
        var self = this;

        self.svg
            .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", self.width)
                .attr("height", self.height)
                .attr("fill", "transparent")
                .attr("stroke", "none")
    },

    draw_background: function() {
        var self = this;

        // Add graph background
        self.svg.append("rect")
            .attr("x", self.padding[0] + self.rect_adjust[0])
            .attr("y", self.padding[1] + self.rect_adjust[1])
            .attr("width", self.width - self.padding[2] + self.rect_adjust[2])
            .attr("height", self.height - self.padding[3] + self.rect_adjust[3])
            .attr("fill", "lightgray");
    },

    draw_border: function() {
        var self = this;

        // Add graph background
        self.svg.append("rect")
            .attr("x", self.padding[0] + self.rect_adjust[0])
            .attr("y", self.padding[1] + self.rect_adjust[1])
            .attr("width", self.width - self.padding[2] + self.rect_adjust[2])
            .attr("height", self.height - self.padding[3] + self.rect_adjust[3])
            .attr("fill", "transparent")
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .style("pointer-events", "none");
    },

    draw_shade: function() {
        var self = this;

        var shade_config;
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                shade_config = [
                    [
                        self.padding[0] + self.rect_adjust[0] + 0.5,
                        self.padding[1] + self.rect_adjust[1] + 1,
                        self.width - self.padding[2] + self.rect_adjust[2] - 1,
                        self.height - self.padding[3] + self.rect_adjust[3] - 1.5,
                        "url(#grossFadeToBlack_h)"
                    ], [
                        self.padding[0] + self.rect_adjust[0] + 0.5,
                        self.padding[1] + self.rect_adjust[1] + 0.5,
                        self.width - self.padding[2] + self.rect_adjust[2] - 1.5,
                        6,
                        "url(#thinFadeToBlack_v1)"
                    ], [
                        self.padding[0] + self.rect_adjust[0] + 1,
                        self.padding[1] + self.rect_adjust[1] + self.height - self.padding[3] + self.rect_adjust[3] - 3,
                        self.width - self.padding[2] + self.rect_adjust[2] - 2.5,
                        2,
                        "url(#thinFadeToBlack_v2)"
                    ]
                ];
            break;
            case PlayoutTimeline.VERTICAL:
                shade_config = [
                    [
                        self.padding[0] + self.rect_adjust[0] + 0.5,
                        self.padding[1] + self.rect_adjust[1] + 1,
                        self.width - self.padding[2] + self.rect_adjust[2] - 1,
                        self.height - self.padding[3] + self.rect_adjust[3] - 1.5,
                        "url(#grossFadeToBlack_v)"
                    ], [
                        self.padding[0] + self.rect_adjust[0] + 0.5,
                        self.padding[1] + self.rect_adjust[1] + 1,
                        6,
                        self.height - self.padding[3] + self.rect_adjust[3] - 1.5,
                        "url(#thinFadeToBlack_h1)"
                    ], [
                        self.padding[0] + self.rect_adjust[0] + self.width - self.padding[2] + self.rect_adjust[2] - 2.5,
                        self.padding[1] + self.rect_adjust[1] + 1,
                        2,
                        self.height - self.padding[3] + self.rect_adjust[3] - 1.5,
                        "url(#thinFadeToBlack_h2)"
                    ]
                ];
            break;
        }

        for (var i = 0, li = shade_config.length; i < li; ++i) {
            self.svg.append("rect")
                .attr("x", shade_config[i][0])
                .attr("y", shade_config[i][1])
                .attr("width", shade_config[i][2])
                .attr("height", shade_config[i][3])
                .attr("fill", shade_config[i][4])
                .style("pointer-events", "none");
        }
    },

    handleMouseWheel: function() {
        var self = this;

        // Set quota depending on mouse position over layer
        var position = d3.mouse(event.currentTarget)[self.timeline.layout];
        var quota = position / self.drawing_width;

        // New scale factor
        self.scale_factor = Math.pow(2, d3.event.wheelDelta * .002) * self.scale_factor;

        // Scale
        self.scale(self.scale_factor, quota);
        d3.event.preventDefault();
    },

    scale: function(factor, quota) {
        var self = this;

        // Calculate new span and span delta
        var new_span = 1 / factor * self.orig_axis_span;
        var span_diff = new_span - self.axis_span;

        // Apply delta to start and end depending on quota
        self.start.subtract(span_diff / 2 * quota);
        self.end.add(span_diff / 2 * (1 - quota));

        // Fix axis span
        self.axis_span = self.end.diff(self.start);

        // Redraw
        self.timeline.centerTime(moment(self.start).add(self.axis_span / 2));
        self.timeline.draw_highlights();
    },

    handlePanningEvent: function() {
        var self = this;
        if (d3.event) {
            // Calculate differential translation
            var tr_diff = d3.event.translate[self.timeline.layout] - self.translate; // Layout is 0 for HOR and 1 for VERT
            self.translate = d3.event.translate[self.timeline.layout];

            // Convert to time and apply
            self.timeline.panTime(self.pixelsToTime(tr_diff));
        }
    },

    panTime: function(time, smooth, callback) {
        var self = this;

        // Calculate new time window position
        self.start.subtract(time);
        self.end.subtract(time);

        // Reset domain and axis
        self.time_scale.domain([self.start, self.end])

        // Select target depending on smooth value
        target = self.g_axis;
        if (smooth) {
            target = target.transition()
                .duration(500)
                .each("end", function() {
                    self.timeline.configure_events();
                    self.zoom_obj.translate(translation);
                    if (typeof callback === "function") {
                        callback();
                    }
                });
        }

        // Apply changes to axis
        target.call(self.axis);

        // Redraw
        self.redraw(smooth);
        self.draw_now_indicator();
    },

    centerTime: function(time, smooth, callback) {
        var self = this;

        // Calculate new time window position
        self.start = moment(time).subtract(self.axis_span / 2);
        self.end = moment(self.start).add(self.axis_span);

        // Reset domain and axis
        self.time_scale.domain([self.start, self.end])

        // Select target depending on smooth value
        target = self.g_axis;
        if (smooth) {
            self.timeline.release_events();
            target = target.transition()
                .duration(500)
                .each("end", function() {
                    self.timeline.configure_events();
                    if (typeof callback === "function") {
                        callback();
                    }
                });
        }

        // Apply changes to axis
        target.call(self.axis);

        // Redraw
        self.redraw(smooth);
        self.draw_now_indicator();
    },

    zoom_playlist: function(playlist, smooth) {
        var self = this;

        // Calculate new start and end based on playlist data
        var pl_start = moment.unix(playlist.get("start"));
        var pl_end = moment.unix(playlist.get("end"));
        var gap = pl_start.diff(pl_end) * 0.025;

        // Assign new values
        self.start = pl_start.add(gap);
        self.end = pl_end.subtract(gap);
        self.axis_span = self.end.diff(self.start);
        self.scale_factor = self.orig_axis_span / self.axis_span;

        // Update axis
        self.time_scale.domain([self.start, self.end]);
        self.g_axis.transition().duration(500)
            .call(self.axis);

        // Redraw
        self.redraw(smooth);
        self.draw_now_indicator();
        self.timeline.draw_highlights(smooth);
    },

    redraw: function(smooth) {
        var self = this;

        var quota = self.axis_span / self.drawing_width;

        var rects = self.vis.selectAll("rect");

        // Setup comparison function
        var comparator = undefined;
        if (self.unique_id !== undefined) {
            comparator = function(d, i) {
                return d[self.unique_id];
            };
        }
        var updated_set = rects.data(self.data, comparator);

        // Add elements
        updated_set
            .enter()
            .append("svg:rect")

        // Update attributes (depending on smooth)
        var target = updated_set;
        if (smooth) {
            target = target.transition().duration(500);
        }
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                updated_set
                    .attr("y", 1.5)
                    .attr("height", self.drawing_height - 1.5)
                target
                    .attr("x", function(d) { return Math.floor(moment.unix(d.get("start")).diff(self.start) / quota);})//function(d) {return d.x;})
                    .attr("width", function(d) { return moment.unix(d.get("end")).diff(moment.unix(d.get("start"))) / quota; });//function(d) {return d.r;})
            break;
            case PlayoutTimeline.VERTICAL:
                updated_set
                    .attr("x", 0)//function(d) {return d.x;})
                    .attr("width", self.drawing_height - 0.5)//function(d) {return d.r;})
                target
                    .attr("y", function(d) { return Math.floor(moment.unix(d.get("start")).diff(self.start) / quota);})
                    .attr("height", function(d) { return moment.unix(d.get("end")).diff(moment.unix(d.get("start"))) / quota; });
            break;
        }
        updated_set
            .attr("style", function(d) { return "fill: #F80;"; }) //((d.get("cid").indexOf("-") == -1) ? "fill: black;" : "fill: red;"); })
            .on("click", function(d) {
                // Focus on click
                self.timeline.focus_playlist(d);
            })

        // Remove elements that exited
        updated_set
            .exit()
            .remove();

    },

    draw_now_indicator: function(now) {
        var self = this;

        // In case now is not defined
        if (now === undefined) {
            now = moment();
        }

        var quota = self.axis_span / self.drawing_width;

        // Adjust metrics to layout
        var line_metrics;
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                line_metrics = [Math.floor(now.diff(self.start) / quota), Math.floor(now.diff(self.start) / quota), 0, self.height - self.padding[3]];
            break;
            case PlayoutTimeline.VERTICAL:
                line_metrics = [0, self.width - self.padding[2], Math.floor(now.diff(self.start) / quota), Math.floor(now.diff(self.start) / quota)];
            break;
        }

        var line = self.vis.selectAll("line#now").data([now]);
        line.enter()
            .append("line");

        line
            .attr("id", "now")
            .attr("x1", line_metrics[0])
            .attr("x2", line_metrics[1])
            .attr("y1", line_metrics[2])
            .attr("y2", line_metrics[3])
            .attr("stroke", "red")
            .attr("stroke-width", "1px")

    },

    updateData: function(new_data, no_redraw) {
        var self = this;

        self.data = new_data;

        if (new_data.length > 0) {
            self.ref = new_data[0].get("start");
        }

        if (!no_redraw) {
            self.redraw();
        }
    },

    filtered_data: function() {
        var self = this;

        return self.data.filter(function(elem) {
            return (
                moment.unix(elem.get("start")) < self.end &&
                moment.unix(elem.get("end")) > self.start
            );
        });
    },

    pixelsToTime: function(pixels) {
        var self = this;

        // Calculate screen displacement quota
        var quota = pixels / self.drawing_width;
        // Translate quota to time
        var amount = self.end.diff(self.start) * quota;

        return amount;
    },

    timeToPixels: function(time) {
        var self = this;

        // Translate time to quota
        var quota = time / self.end.diff(self.start);
        // Calculate screen displacement quota
        var pixels = quota * self.drawing_width;

        return pixels;
    },
};



window.PlayoutView = Backbone.View.extend({
    el: '#content',
    initialize: function() {
        var self = this;
        self.ratio = 25;
        self.$el.html(template.playout());

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
        /*
        var EmptySpace = function(start, end, cid) {
            this.classes = 'well alert-error';
            this.title = function() { return "" };
            this.start = function() { return start; };
            this.end = function() { return end; };
            this.cid = cid;
            this.height = ko.computed(function() {
                return (this.end - this.start) / self.ratio + "px";
            }, this);
        };
        */

        var ScheduleViewModel = function(collection) {
            this.occurs = ko.observableArray();
            //this.occurs = [];
            this.update(collection);
        };

        ScheduleViewModel.prototype.update = function(collection) {
            if (this.occurs().length > 0) {
                this.occurs.removeAll();
            }
            //this.occurs.length = 0;
            for (i = 0; i < collection.length; i++) {
                var cur = collection.models[i];
                //var next = collection.models[i+1];
                this.occurs.push(new OccurrenceViewModel(cur));
                /*
                if (next && cur.get('end') != next.get('start')) {
                    this.occurs.push(new EmptySpace(cur.get('end'), next.get('start'), cur.cid + "-" + next.cid))
                };
                */
            }
        };


        this.view_model = new ScheduleViewModel(self.collection);

        this.timeline = new PlayoutTimeline({
            container: "#playout #svg",
            unique_id: "cid",
            width: 1560,
            height: 650,
            layout: PlayoutTimeline.VERTICAL,
            //follow: true,
            panels: [{
                span: 1,
                axis: {
                    span: moment.duration(24, "hours"),
                    //ticks: 12,
                }
            }, {
                span: 2,
                axis: {
                    span: moment.duration(6, "hours"),
                }
            }, {
                span: 6,
                axis: {
                    span: moment.duration(90, "minutes"),
                },
                zoomable: true,
            }/*, {
                span: 1,
                axis: {
                    span: moment.duration(1350, "seconds"),
                }
            }, {
                span: 1,
                axis: {
                    span: moment.duration(337500, "milliseconds"),
                }
            }, {
                span: 1,
                axis: {
                    span: moment.duration(84375, "milliseconds"),
                }
            }*/],
        });

        for (var i = 0, li = this.timeline.panels.length; i < li; ++i) {
            this.timeline.panels[i].updateData(this.collection.models);
        }

        self.collection.bind('add reset remove change', function(elem) {
            self.view_model.update(self.collection);
            self.render();
        }, this);

        self.collection.bind('all', function (e, a) {
            console.log("PlayoutView > event:" + e + " > ", a);
        }, this);

        this.$el.resize(function() {
            console.log("PlayoutView > container > event:resize");
        });

        //this.render();

        ko.applyBindings(this.view_model, this.el);
    },

    render: function() {
        var self = this;

        //this.timeline.updateData(this.view_model.occurs());
        for (var i = 0, li = this.timeline.panels.length; i < li; ++i) {
            this.timeline.panels[i].updateData(this.collection.models);
        }
    },

});
