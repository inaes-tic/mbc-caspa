
window.PlayoutView = PanelView.extend({
    el: '#content',
    initialize: function() {
        PanelView.prototype.initialize.apply(this, arguments);

        var self = this;
        self.$el.html(template.playout());

        this.collection = new Media.Schedule();
        this.playlists = new Media.UniversePageable();

        this.svg = this.$el.find("#playout");

        this.timeline = new D3Timeline({
            container: "#playout",
            unique_id: "_id",
            width: this.svg.width(),
            height: this.svg.height(),
            layout: D3Timeline.VERTICAL,
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
                if ($("body").hasClass("folded")) {
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
                    self.collection.simulateOverlap(occurrence);
                    self.collection.forEach(function(elem) {
                        if (elem.hasChanged()) {
                            elem.save();
                        }
                    });
                    self.collection.start_memento();
                }

                // Insert new occurrence
                self.collection.create(occurrence, {
                    success: function() {
                        self.playlists.get(self.drag_origin.get('_id')).save();
                    },
                });
            }

            self.timeline.drag_clear();
        });

        // Config panning events
        this.timeline.bind_callback("panning", _.bind(this.fetch_occurrences, this));

        // Final startup
        this.update_drag();
        this.ready_to_fetch = true;
        this.fetch_occurrences(this.timeline.get_max_bounds());


        var PieceViewModel = kb.ViewModel.extend({
            constructor: function(model) {
                var self = this;
                kb.ViewModel.prototype.constructor.apply(this, arguments);

                // Filename without path
                self.filename = ko.computed(function() {
                    return self.file().substring(self.file().lastIndexOf("/") + 1);
                });

                // Duration percentage
                self.duration_part = ko.computed({
                    read: function() {
                        if (self.parentPlaylist().duration) {
                            return self.model().toMilliseconds(self.durationraw()) * 100 / self.parentPlaylist().duration();
                        }
                    },
                    deferEvaluation: true,
                });

                /*
                self.removePiece = function() {
                    self.model().remove();
                    //console.log(self.parentPlaylist().pieces());
                };
                */
            },
        });

        var PlaylistViewModel = kb.ViewModel.extend({
            constructor: function(model) {
                var self = this;
                kb.ViewModel.prototype.constructor.apply(this, arguments);

                /*
                self.computed_duration = ko.computed({
                    read: function() {
                        var sum = 0;
                        if (self.pieces) {
                            ko.utils.arrayForEach(self.pieces(), function(piece) {
                                sum += piece.model().toMilliseconds(piece.durationraw());
                            });
                        }
                        if (self.duration) {
                            self.duration(sum);
                        }
                        return sum;
                    },
                    //deferEvaluation: true,
                });
                */

            }
        });

        var OccurrenceViewModel = kb.ViewModel.extend({
            constructor: function(model, options) {
                var self = this;
                kb.ViewModel.prototype.constructor.apply(this, arguments);

                $.when.apply(null, self.model().fetchRelated("playlist")).done(function() {
                    $.when.apply(null, self.model().get("playlist").fetchRelated("pieces")).done(function() {
                        //console.log("Everything loaded!");
                    });
                });
            },
        });

        var view_model = {
            ocurrences: kb.collectionObservable(this.collection, {
                factories: {
                    "models": OccurrenceViewModel,
                    "models.playlist": PlaylistViewModel,
                    "models.playlist.pieces.models": PieceViewModel,
                },
            }),
        };

        this.view_model = view_model;
        this.pvm = PlaylistViewModel;

        ko.applyBindings(view_model, $("#pruebita").get(0));

        PanelView.prototype.render.apply(this, arguments);
    },

    render: function() {
        this.timeline.data.update(this.collection.models, this.fetched_bounds);
        this.timeline.redraw();
    },

    update_drag: function() {
        d3.selectAll("#universe ul#playlists li").call(this.external_drag);
    },

    remove_drag: function() {
        $("#universe ul#playlists li").off();
    },

    fetch_occurrences: _.throttle(function(bounds) {
        var self = this;

        // Get window size
        var window_size = bounds.end - bounds.start;

        // Expand the window both sides by it's size
        bounds.start.subtract(window_size);
        bounds.end.add(window_size);

        // Calculate threshold
        var threshold = window_size / 2;

        // Only fetch if threshold has been passed or no fetched bounds are registered
        if (!self.fetched_bounds || Math.abs(bounds.start - self.fetched_bounds.start) > threshold) {
            // Fetching
            this.collection.fetch({
                success: function() {
                    // Update bounds, event:sync redraw will do the work.
                    self.fetched_bounds = bounds;
                },
                error: function(e) {
                    throw new Error("Cannot fetch Schedule.");
                },
                data: {
                    query: {criteria: {in_window: [bounds.start.valueOf(), bounds.end.valueOf()]}},
                },
            });
        }
    }, 1000, {leading: false}),

    canNavigateAway: function(options) {
        // Release resources before navigating away
        PanelView.prototype.destroyView.apply(this, arguments);
        this.universe_view.destroy();
        this.collection.unbind("sync");
        this.playlists.unbind("sync");
        this.collection.unbind("all");
        $(window).off("resize");
        this.remove_drag() // removes effect of external_drag
        this.timeline.unbind_all();
        this.timeline.stop_animation();
        this.undelegateEvents();

        // Router callback
        options["ok"]();
    },
});

