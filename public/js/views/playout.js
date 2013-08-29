// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
// --

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
        self.shades = config.shades;

        self.callbacks = config.callbacks || {};

        self.unique_id = config.unique_id;
        self.filter_bounds = {};

        // Setup comparison function
        if (self.unique_id !== undefined) {
            self.comparator = function(d) {
                return d.get(self.unique_id);
            };
        }

        // Select container from config
        self.container = d3.select(config.container);
        if (self.container.empty()) {
            throw new Error("Timeline: No container");
        }

        // Select or insert svg object
        self.svg = self.container.select("svg");
        if (self.svg.empty()) {
            self.svg = self.container.append("svg:svg");
        }
        self.svg
            .attr("id", "Timeline")
            .attr("class", "Timeline")
            .attr("height", self.height)
            .attr("width", self.width);

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
            config.panels[i].panel_ord = i;
            if (i < li - 1) {
                config.panels[i].highlight = config.panels[i+1].axis.span;
            }
            self.panels.push(new PlayoutTimelinePanel(this, config.panels[i]));
            actual_span += config.panels[i].span;
        }

        // Configure timer for now indicator
        if (self.config.follow) {
            (function follow() {
                var now = self.draw_now_indicator();
                if (self.config.follow) {
                    self.centerTime.call(self, now);
                }
                window.requestAnimationFrame(follow);
            })();
        } else {
            (function animate_now_indicator() {
                self.draw_now_indicator();
                window.requestAnimationFrame(animate_now_indicator);
            })();
        }

    },

    update_data: function(new_data, bounds) {
        this.data = new_data;
        this.fetched_bounds = bounds || this.fetched_bounds;

        // Filter data
        this.cache_filtered_data(true);
    },

    cache_filtered_data: function(force_filter) {
        var self = this;

        var filter_bounds = self.get_max_bounds();

        if (force_filter || filter_bounds.start != self.filter_bounds.start || filter_bounds.end != self.filter_bounds.end) {
            self.filter_bounds = filter_bounds;

            self.filtered_data = self.data.filter(function(elem) {
                return (
                    elem.get("start") < self.filter_bounds.end &&
                    elem.get("end") > self.filter_bounds.start
                );
            });

            this.update_empty_spaces();
            this.update_start_places();
        }

        return self.filtered_data;
    },

    get_max_bounds: function() {
        var span;
        var panel;
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            if (span === undefined || this.panels[i].axis_span > span) {
                span = this.panels[i].axis_span;
                panel = i;
            }
        }
        return {
            start: moment(this.panels[panel].start),
            end: moment(this.panels[panel].end),
        };
    },

    update_empty_spaces: function() {
        var self = this;

        var start_list = [];
        var end_list = [];

        for (var i = 0, li = self.filtered_data.length; i < li; ++i) {
            var pl = self.filtered_data[i];
            var tmp_start = pl.get("start");

            var is_end = _.indexOf(end_list, tmp_start, true);
            if (is_end > -1) {
                end_list.splice(is_end, 1);
            } else {
                start_list.splice(_.sortedIndex(start_list, tmp_start), 0, tmp_start);
            }

            var tmp_end = pl.get("end");
            var tmp_diff_end = Math.abs(tmp_end - time);

            var is_start = _.indexOf(start_list, tmp_end, true);
            if (is_start > -1) {
                start_list.splice(is_start, 1);
            } else {
                end_list.splice(_.sortedIndex(end_list, tmp_end), 0, tmp_end);
            }
        }

        self.empty_spaces = [];
        var carry = -Infinity;
        for (var i = 0, li = start_list.length; i < li; ++i) {
            self.empty_spaces.push({
                start: carry,
                end: start_list[i],
                duration: start_list[i] - carry,
                get: function(key) { return this[key]; },
            });
            carry = end_list[i];
        }
        self.empty_spaces.push({
            start: carry,
            end: Infinity,
            duration: Infinity - carry,
            get: function(key) { return this[key]; },
        });
    },

    update_start_places: function() {
        var self = this;

        self.start_places = self.filtered_data.map(function(elem) {
            return elem.get("start");
        });
    },

    panTime: function(time, smooth) {
        var self = this;
        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].panTime(time, smooth);
        }

        this.callback("panning", [this.get_max_bounds()]);
    },

    centerTime: function(time, smooth) {
        var self = this;
        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].centerTime(time, smooth);
        }

        if (this.dragging_playlist !== undefined) {
            this.drag_move(this.dragging_playlist);
        }

        this.callback("panning", [this.get_max_bounds()]);
    },

    draw_now_indicator: function() {
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

        this.callback("panning", [this.get_max_bounds()]);
    },

    resize: function(width, height, smooth) {
        var self = this;

        self.width = width;
        self.height = height;

        self.smoothify(self.svg, smooth)
            .attr("height", self.height)
            .attr("width", self.width);

        for (var i = 0, li = self.panels.length; i < li; ++i) {
            self.panels[i].resize(smooth);
        }
    },

    redraw: function(smooth, ignore_drag) {
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            this.panels[i].redraw(smooth);
        }

        if (!ignore_drag && this.dragging_playlist !== undefined) {
            this.drag_move(this.dragging_playlist);
        }
    },

    get_playlist_central_time: function(playlist) {
        var start = moment(playlist.get("start"));
        var diff = start.diff(moment(playlist.get("end")));
        return start.subtract("milliseconds", diff / 2);
    },

    configure_shades: function() {
        var self = this;

        if (!self.shades) {
            return false;
        }

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

    smoothify: function(elem, smooth) {
        var target = elem;
        if (smooth) {
            target = target.transition().duration(500);
        }
        return target;
    },

    drag_get_time: function(plist) {
        var time;
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            time = time || this.panels[i].drag_get_time(plist);
        }
        return time;
    },

    drag_move: function(plist, panel) {
        var draw = false;
        var occurrence;

        // Get drag position time
        var time = this.drag_get_time(plist);

        if (time) {
            this.dragging_playlist = plist;

            // Setup temporal occurrence
            occurrence = {
                name: plist.get("name"),
                start: time,
                end: time + plist.get("duration"),
                get: function(key) { return this[key]; },
                set: function(key, value) { this[key] = value; },
            };

            if (event.ctrlKey) {
                // Call external push down
                this.update_data(this.callback("fix_overlap", [occurrence]));
                this.redraw(this.config.smooth_drag, true);
                this.update_data(this.callback("restore_overlap"));
            } else {
                // Call external revert
                this.update_data(this.callback("restore_overlap"));
                this.redraw(this.config.smooth_drag, true);
            }
        } else {
            // Call external revert
            this.update_data(this.callback("restore_overlap"));
            this.redraw(this.config.smooth_drag, true);
        }

        var tmp_draw;
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            draw |= this.panels[i].drag_move(plist, occurrence);
        }

        // True if something has been drawn
        return draw;
    },

    drag_clear: function() {
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            this.panels[i].drag_clear();
        }
        this.dragging_playlist = undefined;

        // Call external revert
        this.update_data(this.callback("restore_overlap"));
        this.redraw(this.config.smooth_drag, true);
    },

    drag_end: function(plist, panel) {
        var create = false;
        var time = this.drag_get_time(plist);
        for (var i = 0, li = this.panels.length; i < li; ++i) {
            create = create || this.panels[i].drag_end(plist, time);
        }

        return (create ? time : undefined);
    },

    bind_callback: function(name, callback) {
        return this.callbacks[name] = callback;
    },

    callback: function(name, args) {
        if (this.callbacks[name]) {
            return this.callbacks[name].apply(this, args);
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

        // Panel Setup
        self.timeline = timeline;
        self.config = config;

        self.scale_factor = 1;
        self.translate = 0;

        self.axis_span = self.config.axis.span;
        self.orig_axis_span = self.config.axis.span;

        self.calculate_metrics();

        // Draw main svg panel
        self.svg = self.timeline.svg.select("svg#Panel-" + self.config.panel_ord);
        if (self.svg.empty()) {
            self.svg = self.timeline.svg.append("svg");
            self.svg.attr("id", "Panel-" + self.config.panel_ord);
            self.svg.attr("class", "Panel");
        }

        // Add transparent background (for clicking purposes)
        self.draw_click_area();

        // Draw background
        self.background = self.svg.select("rect.Background");
        if (self.background.empty()) {
            self.background = self.svg.append("rect");
            self.background.attr("class", "Background");
        }

        // Draw visualization
        self.vis = self.svg.select("g.Visualization");
        if (self.vis.empty()) {
            self.vis = self.svg.append("svg:g");
            self.vis.attr("class", "Visualization");
        }

        // Configure zooming events
        self.zoom_obj = d3.behavior.zoom();
        if (!self.config.zoomable) {
            self.zoom_obj.scaleExtent([1, 1]);
        }
        if (!self.timeline.config.follow) {
            self.configure_events();
        }

        // Setup Axis
        self.start = moment().subtract("milliseconds", self.axis_span.asMilliseconds() / 2);
        self.end = moment(self.start).add(self.axis_span);

        self.time_scale = d3.time.scale();

        self.axis = d3.svg.axis();
        self.axis.tickSubdivide(1);
        if (self.config.axis.ticks !== undefined) {
            self.axis.ticks(self.config.axis.ticks);
        }

        // Draw axis
        self.g_axis = self.svg.select("g.Axis");
        if (self.g_axis.empty()) {
            self.g_axis = self.svg.append("g");
            self.g_axis.attr("class", "Axis");
        }

        // Add highlight
        if (config.highlight) {
            self.draw_highlight(config.highlight);
        }

        // Draw Shades
        self.draw_shade();

        // Draw graphic border
        self.border = self.svg.select("rect.Border");
        if (self.border.empty()) {
            self.border = self.svg.append("rect");
            self.border.attr("class", "Border");
        }
        self.border.style("pointer-events", "none");

        // Apply metrics to all drawn elements
        self.apply_metrics();
    },

    calculate_metrics: function() {
        var self = this;

        // Calculate metrics depending on layout
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                self.height = Math.floor(self.config.span / self.config.total_span * self.timeline.height);
                self.width = self.timeline.width - 0.5;
                self.x = 0.5;
                self.y = self.timeline.height - Math.floor(self.config.actual_span / self.config.total_span * self.timeline.height) - self.height + 0.5;

                self.padding = [0, 0, 0, 35];
                self.orient = "bottom";
                self.drawing_width = self.width - self.padding[2];
                self.drawing_height = self.height - self.padding[3];
                self.drawing_quota = self.axis_span / self.drawing_width;

                self.rect_adjust = [0.5, 1, -0.5, -1];
                self.axis_adjust = [self.padding[0] + 0.5, (self.height - self.padding[3])];
            break;
            case PlayoutTimeline.VERTICAL:
                self.height = self.timeline.height;
                self.width = Math.floor(self.config.span / self.config.total_span * self.timeline.width);
                self.x = Math.floor(self.config.actual_span / self.config.total_span * self.timeline.width) - 0.5;
                self.y = -0.5;

                self.padding = [65, 0, 65, 0];
                self.orient = "left";
                self.drawing_width = self.height - self.padding[3];
                self.drawing_height = self.width - self.padding[2];
                self.drawing_quota = self.axis_span / self.drawing_width;

                self.rect_adjust = [0, 0.5, 0, -0.5];
                self.axis_adjust = [self.padding[0], self.padding[1] + 0.5];
            break;
        }
    },

    apply_metrics: function(smooth) {
        var self = this;

        // Panel main SVG
        self.smoothify(self.svg, smooth)
            .attr("x", self.x)
            .attr("y", self.y)
            .attr("width", self.width)
            .attr("height", self.height);

        // Background
        self.smoothify(self.background, smooth)
            .attr("x", self.padding[0] + self.rect_adjust[0])
            .attr("y", self.padding[1] + self.rect_adjust[1])
            .attr("width", self.width - self.padding[2] + self.rect_adjust[2])
            .attr("height", self.height - self.padding[3] + self.rect_adjust[3]);

        // Visualization
        self.smoothify(self.vis, smooth)
            .attr("transform", "translate(" + self.padding[0] + "," + self.padding[1] + ")");

        // Time Scale
        self.time_scale
            .range([0, self.drawing_width - 1])
            .domain([self.start, self.end]);

        // Axis
        self.axis
            .scale(self.time_scale)
            .orient(self.orient)
            .tickSize(-self.drawing_height, 6, -self.drawing_height);

        // Graphical Axis
        self.smoothify(self.g_axis, smooth)
            .attr("transform", "translate(" + self.axis_adjust[0] + "," + self.axis_adjust[1] + ")")
            .call(self.axis);

        // Border
        self.smoothify(self.border, smooth)
            .attr("x", self.padding[0] + self.rect_adjust[0])
            .attr("y", self.padding[1] + self.rect_adjust[1])
            .attr("width", self.width - self.padding[2] + self.rect_adjust[2])
            .attr("height", self.height - self.padding[3] + self.rect_adjust[3]);
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
        var hl = self.svg.select("rect.Highlight");
        if (hl.empty()) {
            hl = self.svg.append("rect");
        }

        // Smooth if required
        self.smoothify(hl, smooth)
            .attr("class", "Highlight")
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
        self.svg.on("dblclick.zoom", null);
    },

    release_events: function() {
        this.svg
            .on("mousedown.zoom", null)
            .on("mousewheel.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("dblclick.zoom", null)
            .on("touchend.zoom", null);
    },

    resize: function(smooth) {
        this.calculate_metrics();
        this.apply_metrics(smooth);
        this.timeline.draw_highlights(smooth);
        this.draw_shade(smooth);
        this.redraw(smooth);
    },

    draw_click_area: function() {
        // TODO: is there a better way?
        this.svg
            .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("fill", "transparent")
                .attr("stroke", "none")
                .attr("class", "ClickArea");
    },

    draw_shade: function(smooth) {
        var self = this;

        if (!self.timeline.shades) {
            return false;
        }

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
            var shade = self.svg.select("rect#Shade-" + i);
            if (shade.empty()) {
                shade = self.svg.append("rect");
                shade.attr("id", "Shade-" + i);
            }

            self.smoothify(shade, smooth)
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
        var factor = Math.pow(2, d3.event.wheelDelta * .002) * self.scale_factor;

        // Scale
        self.scale(factor, quota);
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

        // Fix axis span and factor
        self.axis_span = self.end.diff(self.start);
        self.drawing_quota = self.axis_span / self.drawing_width;
        self.scale_factor = factor;

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
        var pl_start = moment(playlist.get("start"));
        var pl_end = moment(playlist.get("end"));
        var gap = pl_start.diff(pl_end) * 0.025;

        // Assign new values
        self.start = pl_start.add(gap);
        self.end = pl_end.subtract(gap);
        self.axis_span = self.end.diff(self.start);
        self.drawing_quota = self.axis_span / self.drawing_width;
        self.scale_factor = self.orig_axis_span / self.axis_span;

        // Update axis
        self.time_scale.domain([self.start, self.end]);
        self.smoothify(self.g_axis, smooth)
            .call(self.axis);

        // Redraw
        self.redraw(smooth);
        self.draw_now_indicator();
        self.timeline.draw_highlights(smooth);
    },

    redraw: function(smooth) {
        var self = this;

        var rects = self.vis.selectAll("svg.Playlist");

        var filtered_data = self.timeline.cache_filtered_data();

        // Playlist data
        var updated_set = rects.data(filtered_data, self.timeline.comparator);

        var new_plist = self.draw_playlists(updated_set, smooth);

        // On zoomable panels: clip resolution
        if (self.config.zoomable) {

            // Draw clips only when playlist is visible
            function playlist_visible(plist) {
                return (
                    moment(plist.get("start")) < self.end &&
                    moment(plist.get("end")) > self.start
                );
            }

            var second_level = updated_set.selectAll("svg.Clip").data(function(d) {
                // FIXME: fetchRelated success callback is almost useless.
                // This whole function could be tidier without using it.
                var ret = [];
                if (playlist_visible(d)) {
                    var pl = d.get('playlist');
                    if (!pl) {
                        d.fetchRelated("playlist", {
                            success: function(def_pl) {
                                def_pl.bind("sync", function() {
                                    def_pl.unbind("sync");
                                    def_pl.fetchRelated("pieces", {
                                        success: function(def_pieces) {
                                            def_pieces.bind("sync", function() {
                                                def_pieces.unbind("sync");
                                                self.redraw(smooth);
                                            });
                                        },
                                        error: function() {
                                            console.warn("Could not fetch related pieces.");
                                        },
                                    });
                                });
                            },
                            error: function() {
                                console.warn("Could not fetch related playlist.");
                            },
                        });
                    } else {
                        var pces = pl.get('pieces');
                        if (!pces || !pces.length) {
                            pl.fetchRelated("pieces", {
                                success: function(def_pces) {
                                    def_pces.bind("sync", function() {
                                        def_pces.unbind("sync");
                                        self.redraw(smooth);
                                    });
                                },
                                error: function() {
                                    console.warn("Could not fetch related pieces.");
                                },
                            });
                        } else {
                            // This is in case more pieces were added since we fetchRelated them.
                            pl.fetchRelated("pieces");
                            ret = pces.models;
                        }
                    }
                }
                return ret;
            });

            function length_to_duration(val) {
                if (!val) {
                    return 0;
                }

                var tmp = val.split(".");
                var ms = tmp[1] * 10;
                tmp = tmp[0].split(":");

                return moment.duration({
                    hours: tmp[0],
                    minutes: tmp[1],
                    seconds: tmp[2],
                    milliseconds: ms,
                }).valueOf();
            }

            function playlist_length(plist) {
                return moment(plist.get("end")).diff(moment(plist.get("start")));
            }

            // Setup playlist text
            var plist_text = new_plist.append("text")
                .text(function(d) { return d.get("title"); })
                .attr("class", "Name")
                .attr("font-size", 26);

            switch(self.timeline.layout) {
                case PlayoutTimeline.HORIZONTAL:
                    plist_text
                        .attr("y", function(d) { return $(this).height(); })
                        .attr("x", 5)
                break;
                case PlayoutTimeline.VERTICAL:
                    plist_text
                        .attr("y", function(d) { return $(this).height(); })
                        .attr("x", function(d) { return -($(this).width() + 5); })
                        .attr("transform", "rotate(-90)")
                break;
            }

            // Setup clip metrics
            var attr_sel;
            switch(self.timeline.layout) {
                case PlayoutTimeline.HORIZONTAL:
                    attr_sel = ["x", "y", "width"];
                break;
                case PlayoutTimeline.VERTICAL:
                    attr_sel = ["y", "x", "height"];
                break;
            }

            // Setup new clips
            var new_clips = second_level.enter();
            var new_svg = new_clips.append("svg:svg").attr("class", "Clip"); // Svg Object
            new_svg.append("svg:rect"); // Background
            new_svg.append("text"); // Text

            // Update new and old clips
            second_level
                .attr(attr_sel[0], function(d, i, j) {
                    var length = playlist_length(filtered_data[j]);
                    var list = d.collection.models;
                    var sum = 0;
                    for (var k = 0; k < i; ++k) {
                        sum += length_to_duration(list[k].get("durationraw"));
                    }
                    return sum * 100 / length + "%";
                })
                .attr(attr_sel[1], "40")
                .attr(attr_sel[2], function(d, i, j) {
                    var length = playlist_length(filtered_data[j]);
                    var my_length = length_to_duration(d.get("durationraw"));
                    return my_length * 100 / length + "%";
                })

            second_level.select("rect")
                .attr("y", 0).attr("x", 0).attr("height", "100%").attr("width", "100%")
                .style("opacity", function(d, i) { return i % 2 ? 0.3 : 0.2; })
                .style("fill", "black");

            // Setup clip text
            var clip_text = second_level.select("text")
                .text(function(d) { return d.get("file").substr(d.get("file").lastIndexOf("/") + 1); })
                .attr("font-size", 14)
                .style("stroke", "none")
                .style("fill", "white");

            switch(self.timeline.layout) {
                case PlayoutTimeline.HORIZONTAL:
                    clip_text
                        .attr("y", function(d) { return $(this).height(); })
                        .attr("x", function(d) { return -($(this).width() + 5); })
                        .attr("transform", "rotate(-90)")
                break;
                case PlayoutTimeline.VERTICAL:
                    clip_text
                        .attr("y", function(d) { return $(this).height(); })
                        .attr("x", 5);
                break;
            }

            // Remove elements that are not being showed
            second_level.exit().remove();

        } else {
            new_plist
                .append("text")
                    .text(function(d) { return d.get("title") ; })
                    .attr("class", "Name")
                    .attr("y", 12)
                    .attr("x", 3);
        }

        self.reposition_now_indicator();
        self.reposition_fetch_bounds(smooth);
    },

    draw_playlists: function(selection, smooth, class_name, color) {
        var self = this;

        // Setup
        if (class_name === undefined) {
            class_name = "Playlist";
        }

        // Add elements
        var new_plist = selection.enter()
            .append("svg:svg")
                .attr("class", class_name);

        // Add background to new element
        new_plist
            .append("svg:rect")
                .style("fill", function(d, i) {
                    return color ? color : utils.color_scale(d.get("_id"));
                })
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", "100%")
                .attr("width", "100%")


        // Update attributes (depending on smooth)
        var target = self.smoothify(selection, smooth);
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                selection
                    .attr("y", 1.5)
                    .attr("height", self.drawing_height - 1.5)
                target
                    .attr("x", function(d) { return (d.get("start") - self.start) / self.drawing_quota; })
                    .attr("width", function(d) { return (d.get("end") - d.get("start")) / self.drawing_quota; });
            break;
            case PlayoutTimeline.VERTICAL:
                selection
                    .attr("x", 0)
                    .attr("width", self.drawing_height - 0.5)
                target
                    .attr("y", function(d) { return (d.get("start") - self.start) / self.drawing_quota; })
                    .attr("height", function(d) { return (d.get("end") - d.get("start")) / self.drawing_quota; });
            break;
        }
        selection
            .on("click", function(d) {
                // Focus on click
                if (!d3.event.defaultPrevented) {
                    self.timeline.focus_playlist(d);
                }
            })

        // Remove elements that exited
        selection
            .exit()
            .remove();

        return new_plist;
    },

    drag_get_time: function(plist) {
        var self = this;

        // Position
        var x, y, width, height;
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                y = event.offsetX - self.svg.attr("x") - self.padding[0];
                x = event.offsetY - self.svg.attr("y") - self.padding[1];
                height = self.width - self.padding[2];
                width = self.height - self.padding[3];
            break;
            case PlayoutTimeline.VERTICAL:
                x = event.offsetX - self.svg.attr("x") - self.padding[0];
                y = event.offsetY - self.svg.attr("y") - self.padding[1];
                width = self.width - self.padding[2];
                height = self.height - self.padding[3];
            break;
        }

        // Check bounds
        var time;
        if ( x > 0 && y > 0 && x <= width && y <= height) {
            // Calculate new event time
            var mode = "axis";
            if (event.ctrlKey) {
                //mode = "exact";
                mode = "push";
            } else if (event.shiftKey) {
                mode = "snap";
            }
            time = self.get_pos_time(y, mode, plist);
        }

        return time;
    },

    drag_move: function(plist, occurrence) {
        var self = this;

        var data = (occurrence ? [occurrence] : []);

        var drsh = self.vis.selectAll("svg.DragShadow").data(data);

        var new_plist = self.draw_playlists(drsh, this.timeline.config.smooth_drag, "DragShadow", "black");

        // Text container (for relative sizing)
        var txt_cont = drsh.select("svg");
        if (txt_cont.empty()) {
            txt_cont = drsh.append("svg:svg");
            txt_cont.attr("viewBox", "0 0 100 100");
            txt_cont = txt_cont.append("svg:g");
        }

        // Text rotation
        if (self.timeline.layout == PlayoutTimeline.HORIZONTAL) {
            txt_cont.attr("transform", "rotate(-90 50 50)");
        }

        // Title
        var text = txt_cont.select("text.Title");
        if (text.empty()) {
            text = txt_cont.append("svg:text")
                .text(function(d) {
                    return d.name;
                })
                .attr("x", "50%")
                .attr("y", "75%")
                .attr("class", "Title")
                .style({
                    "stroke": "none",
                    "fill": "white",
                    "alignment-baseline": "middle",
                    "text-anchor": "middle",
                    "pointer-events": "none",
                    "font-size": "25",
                });
        }

        // Text time description
        var text = txt_cont.select("text.Time");
        if (text.empty()) {
            text = txt_cont.append("svg:text")
                .text("00:00:00.000")
                .attr("x", "50%")
                .attr("y", "25%")
                .attr("class", "Time")
                .style({
                    "stroke": "none",
                    "fill": "white",
                    "alignment-baseline": "middle",
                    "text-anchor": "middle",
                    "pointer-events": "none",
                    "font-size": "25",
                });
        }
        text.text(function(d) { return moment(d.start).format("HH:mm:ss.SSS"); });

        drsh.exit().remove();

        // True if occurrence inside time window
        return (occurrence && occurrence.start < self.end && occurrence.end > self.start);
    },

    drag_clear: function() {
        this.svg.selectAll("svg.DragShadow").remove();
    },

    drag_end: function(plist, time) {
        var self = this;
        var create = false;

        // Time defined and inside time window
        if (time && (time < self.end || time + plist.get("duration") > self.start)) {
            create = true;
        }

        return create;
    },

    get_pos_time: function(pos, mode, playlist) {
        // Setup duration
        var duration = 0;
        if (playlist) {
            duration = playlist.get("duration");
        }

        // Setup start time
        var start = this.start + this.pixelsToTime(pos);

        var time;
        switch(mode) {
            case "axis":
                time = this.get_snap_time(start, duration, this.get_nearest_empty_space(start, duration, this.divide_empty_spaces()));
            break;
            case "snap":
                time = this.get_snap_time(start, duration, this.get_nearest_empty_space(start, duration));
            break;
            case "exact":
                time = this.start + this.pixelsToTime(pos) - duration / 2;
            break;
            case "push":
                time = this.get_nearest_start(start);
            break;
        }
        return time;
    },

    get_snap_time: function(time, duration, empty_space) {
        var ret;
        var tmp_diff_start = Math.abs(empty_space.get("start") - (time - duration / 2));
        var tmp_diff_end = Math.abs(empty_space.get("end") - (time + duration / 2));
        if (tmp_diff_start < tmp_diff_end) {
            ret = empty_space.get("start").valueOf();
        } else {
            ret = empty_space.get("end") - duration;
        }
        return ret;
    },

    get_nearest_empty_space: function(time, duration, empty_spaces) {
        if (empty_spaces === undefined) {
            empty_spaces = this.timeline.empty_spaces;
        }

        var ret;
        var min_diff;
        for (var i = 0, li = empty_spaces.length; i < li; ++i) {
            var e_s = empty_spaces[i];

            if (e_s.get("duration") >= duration) {
                var tmp_diff_start = Math.abs(e_s.get("start") - (time - duration / 2));
                var tmp_diff_end = Math.abs(e_s.get("end") - (time + duration / 2));
                var tmp_min_diff = Math.min(tmp_diff_start, tmp_diff_end);

                if (min_diff === undefined || tmp_min_diff < min_diff) {
                    min_diff = tmp_min_diff;
                    ret = e_s;
                }
            }
        }

        if (ret === undefined) {
            ret = {
                start: -Infinity,
                end: Infinity,
                duration: Infinity,
                get: function(key) { return this[key]; },
            };
        }

        return ret;
    },

    get_nearest_start: function(time, start_places) {
        if (start_places === undefined) {
            start_places = this.timeline.start_places;
        }

        var ret;
        var min_diff;
        for (var i = 0, li = start_places.length; i < li; ++i) {
            var start = start_places[i];

            var tmp_diff = Math.abs(start - time);

            if (min_diff === undefined || tmp_diff < min_diff) {
                min_diff = tmp_diff;
                ret = start;
            }
        }

        return ret;
    },

    divide_empty_spaces: function(empty_spaces) {
        var self = this;

        if (empty_spaces === undefined) {
            empty_spaces = self.timeline.empty_spaces;
        }

        times = self.time_scale.ticks(self.axis.ticks());

        var partition = [];
        for (var i = 0, li = empty_spaces.length; i < li; ++i) {
            var e_s = empty_spaces[i];
            partition.push(e_s);

            var start = e_s.get("start");
            var end = e_s.get("end");

            for (var j = 0, lj = times.length; j < lj; ++j) {
                var time = times[j];
                if (time > start && time < end) {
                    partition.push({
                        start: start,
                        end: time,
                        duration: time - start,
                        get: function(key) { return this[key]; },
                    });
                    partition.push({
                        start: time,
                        end: end,
                        duration: end - time,
                        get: function(key) { return this[key]; },
                    });
                }
            }
        }

        return partition;
    },

    draw_now_indicator: function(now) {
        var self = this;

        // In case now is not defined
        if (now === undefined) {
            now = moment();
        }

        var diff = now.diff(self.start);

        // Adjust metrics to layout
        var line_metrics;
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                line_metrics = [diff / self.drawing_quota, diff / self.drawing_quota, 0, self.height - self.padding[3]];
            break;
            case PlayoutTimeline.VERTICAL:
                line_metrics = [0, self.width - self.padding[2], diff / self.drawing_quota, diff / self.drawing_quota];
            break;
        }

        // Draw
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

    reposition_now_indicator: function() {
        // Slight hack to make the now indicator be drawn on top
        // of the rest of the elements
        var last_child = $(this.vis[0]).children(":last-child");

        if (!last_child.is("line#now")) {
            var line = $(this.vis[0]).find("line#now");
            line.detach();
            line.appendTo(this.vis[0]);
        }
    },

    reposition_fetch_bounds: function(smooth) {
        var self = this;

        var wait_panel;
        var bounds = this.timeline.fetched_bounds;
        if (bounds) {
            if (bounds.start > self.start) {
                wait_panel = {
                    position: "top",
                    span: bounds.start - self.start,
                };
            }
            if (bounds.end < self.end) {
                wait_panel = {
                    position: "bottom",
                    span: this.end - bounds.end,
                };
            }
        } else {
            wait_panel = {
                position: "full",
            };
        }

        // Comparison function
        function compare(elem) {
            return elem.position;
        }

        var data = (wait_panel ? [wait_panel] : []);

        // Metrics
        var metrics = {};
        switch(self.timeline.layout) {
            case PlayoutTimeline.HORIZONTAL:
                metrics["x"] = function(d) {
                    if (d.position == "bottom") {
                        return self.timeToPixels(self.end - d.span - self.start);
                    } else {
                        return 0;
                    }
                };
                metrics["y"] = self.padding[0];

                metrics["width"] = function(d) {
                    if (d.position == "full") {
                        return self.drawing_width;
                    } else {
                        return self.timeToPixels(d.span);
                    }
                };
                metrics["height"] = self.drawing_height;
            break;
            case PlayoutTimeline.VERTICAL:
                metrics["y"] = function(d) {
                    if (d.position == "bottom") {
                        return self.timeToPixels(self.end - d.span - self.start);
                    } else {
                        return 0;
                    }
                };
                metrics["x"] = self.padding[0];

                metrics["height"] = function(d) {
                    if (d.position == "full") {
                        return self.drawing_width;
                    } else {
                        return self.timeToPixels(d.span);
                    }
                };
                metrics["width"] = self.drawing_height;
            break;
        }

        var selection = this.svg.selectAll("svg.WaitPanel").data(data, compare);

        // Add panel
        var new_panel = selection.enter()
            .append("svg:svg")
                .attr("class", "WaitPanel")
                .append("svg:rect")
                    .style("fill", "#000")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .style("opacity", 0)
                    .transition().duration(500)
                    .style("opacity", 0.5);

        // Add background to new element
        self.smoothify(selection, smooth)
            .attr("y", metrics["y"])
            .attr("x", metrics["x"])
            .attr("height", metrics["height"])
            .attr("width", metrics["width"])
            .style("pointer-events", "none");

        selection.exit().remove();
    },

    pixelsToTime: function(pixels) {
        var self = this;

        // Calculate screen displacement quota
        var quota = pixels / self.drawing_width;
        // Translate quota to time
        var amount = self.axis_span * quota;

        return amount;
    },

    timeToPixels: function(time) {
        var self = this;

        // Translate time to quota
        var quota = time / self.axis_span;
        // Calculate screen displacement quota
        var pixels = quota * self.drawing_width;

        return pixels;
    },

    smoothify: function(elem, smooth) {
        var target = elem;
        if (smooth) {
            target = target.transition().duration(500);
        }
        return target;
    },
};



window.PlayoutView = PanelView.extend({
    el: '#content',
    initialize: function() {
        this.constructor.__super__.initialize.apply(this, arguments);

        var self = this;
        self.$el.html(template.playout());

        this.collection = new Media.Schedule();
        this.playlists = new Media.UniversePageable();

        this.svg = this.$el.find("#playout");

        this.timeline = new PlayoutTimeline({
            container: "#playout",
            unique_id: "_id",
            width: this.svg.width(),
            height: this.svg.height(),
            layout: PlayoutTimeline.VERTICAL,
            //smooth_drag: true,
            //follow: true,
            shades: true,
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
            }],
        });

        this.universe_view = new UniverseListView({
            collection: this.playlists,
            el: $("#universe"),
            draggable: true,
        });

        // Event listeners
        this.collection.bind('sync', function(elem) {
            this.render();
        }, this);

        this.playlists.bind('sync', function(elem) {
            this.update_drag();
        }, this);

        this.collection.bind('all', function (e, a) {
            console.log("PlayoutView > event:" + e + " > ", a);
        }, this);

        $(window).resize(function() {
            if (self.$el.hasClass("trans")) {
                if ($("body").hasClass("Comp")) {
                    self.timeline.resize(self.svg.width(), self.svg.height() + 105, true);
                } else {
                    self.timeline.resize(self.svg.width(), self.svg.height() - 105, true);
                }
                window.setTimeout(function() {
                    self.$el.removeClass("trans");
                }, 400);
            } else {
                self.timeline.resize(self.svg.width(), self.svg.height());
            }
        });

        // Config overlapping handling via callbacks
        function fixOverlap(occurrence) {
            this.collection.memento.store();
            this.collection.simulateOverlap(occurrence);
            return this.collection.models;
        }

        function restoreOverlap() {
            this.collection.memento.restore();
            return this.collection.models;
        }

        this.timeline.bind_callback("fix_overlap", _.bind(fixOverlap, this));
        this.timeline.bind_callback("restore_overlap", _.bind(restoreOverlap, this));

        // Config Drag Events
        self.external_drag = d3.behavior.drag();
        self.external_drag.on("dragstart", function() {
            self.drag_elem = $(event.target).closest("li.playlist-name");
            if (self.drag_elem.length == 1) {
                self.drag_origin = self.playlists.get(self.drag_elem.attr("id"));
            } else {
                self.drag_elem = undefined;
                self.drag_origin = undefined;
            }
        }).on("drag", function() {
            var draw = false;

            var maybe_panel = $(event.target).closest("svg.Panel");
            if (maybe_panel.length == 1) {
                draw = self.timeline.drag_move(self.drag_origin, maybe_panel.attr("id").split("-")[1]);
            } else {
                self.timeline.drag_clear();
            }

            if (draw) {
                $("#content li.ui-draggable-dragging").css("display", "none");
            } else {
                $("#content li.ui-draggable-dragging").css("display", "");
            }
        }).on("dragend", function() {
            var create;

            var maybe_panel = $(event.target).closest("svg.Panel");
            if (maybe_panel.length == 1) {
                create = self.timeline.drag_end(self.drag_origin, maybe_panel.attr("id").split("-")[1], event);
            }

            if (create) {
                var start = moment(create).valueOf();
                var end = start + self.drag_origin.get("duration");

                var occurrence = {
                    title:  self.drag_origin.get('name'),
                    playlist:   self.drag_origin.get('_id'),
                    start:  start,
                    end: end,
                    allDay: false,
                    get: function(key) { return this[key]; },
                    set: function(key, value) { this[key] = value; },
                };

                // Push down mode
                if (event.ctrlKey) {
                    // simulateOverlap saving changes
                    self.collection.simulateOverlap(occurrence, true);
                    self.collection.start_memento();
                }

                // Insert new occurrence
                self.collection.create(occurrence);
            }

            self.timeline.drag_clear();
        });

        // Config panning events
        this.timeline.bind_callback("panning", _.bind(this.fetch_occurrences, this));

        // Final startup
        this.update_drag();
        this.ready_to_fetch = true;
        this.fetch_occurrences(this.timeline.get_max_bounds());
    },

    render: function() {
        this.timeline.update_data(this.collection.models, this.bounds);
        this.timeline.redraw();
    },

    update_drag: function() {
        d3.selectAll("#universe ul#playlists li").call(this.external_drag);
    },

    fetch_occurrences: function(bounds) {
        // Performance timer
        if (!this.ready_to_fetch) {
            this.fetch_requested = true;
            return false;
        } else {
            this.fetch_requested = false;
            this.ready_to_fetch = false;
        }

        var self = this;

        // Fetching
        this.collection.setQuery({criteria: {in_window: [bounds.start.valueOf(), bounds.end.valueOf()]}});
        this.collection.fetch({
            success: function() {
                // Update bounds, event:sync redraw will do the work.
                self.bounds = bounds;
            },
            error: function(e) {
                throw new Error("Cannot fetch Schedule.");
            },
        });

        // Performance timer
        window.setTimeout(function() {
            self.ready_to_fetch = true;
            if (self.fetch_requested) {
                self.fetch_occurrences(self.timeline.get_max_bounds());
            }
        }, 500);
    },
});

