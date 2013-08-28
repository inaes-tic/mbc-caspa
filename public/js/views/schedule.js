window.OccurrenceView = Backbone.View.extend({
    events: {
      "click .fc-event-closebutton": "deleteOcurrence"
    },
    initialize: function() {
      this.calendar = this.options.calendar;
    },
    deleteOcurrence: function(sth) {
      var overlapped = this.model.overlapsWith;
      var options = {success: function() {
        overlapped.forEach(function(o) {
          o.save();
          });
        }
      };
      this.$el.fadeOut(400, this.model.destroy.bind(this.model, options));
      console.log("Deleting ocurrence", this.model);
    }
});

window.ScheduleView = PanelView.extend({
    el: $("#content"),
    get_templateHTML: function () {
        return template.schedule();
    },
    get_collection: function () {
        return this.collection;
    },
    make_event: function(occurrence) {
        // make a Media.Occurrence into a fullCalendar event
        var attribs = _(occurrence.attributes).clone();

        // Fullcalendar needs unix timestamp for rendering
        attribs.start = moment(attribs.start).unix();
        attribs.end = moment(attribs.end).unix();
        attribs.color = utils.color_scale(occurrence.get("_id"));

        attribs.model = occurrence;
        return attribs;
    },
    all_events: function() {
        return this.get_collection().map(this.make_event);
    },
    historical_events: [
        {
            title: 'WALLKINTUN SALE AL AIRE !',
            start: new Date(2012, 11, 7, 22, 0),
            end:   new Date(2012, 11, 8, 6, 0),
            allDay: false,
        },
    ],
    reload: function() {
        this.calendar.fullCalendar('refetchEvents');
    },
    checkOverlap: function(event) {
        // This checks if an event has any overlapping events on the calendar. It expects the event
        // to have a 'start' and an 'end' properties

        var start = moment(event.start);
        var end = moment(event.end);
        var overlap = this.calendar.fullCalendar('clientEvents', function(ev) {
            if( ev == event)
                return false;
            return ev.start < end && ev.end > start;
        });
        if( overlap.length ) {
            // TODO: choose better?
            overlap = overlap[0];
            var over_start = moment(overlap.start);
            var over_end = moment(overlap.end);
            var duration = end - start;
            if( over_start > start ) {
                // clamp to beginning
                end = over_start.clone();
                start = end.clone();
                start.subtract(duration);
            } else {
                // clamp to end
                start = over_end.clone();
                end = start.clone();
                end.add(duration);
            }
        }
        return {start: start, end: end};
    },
    initialize: function () {
        this.constructor.__super__.initialize.apply(this, arguments);

        var self = this;

        self.collection = new Media.Schedule();
        self.playlists = new Media.UniversePageable();

        $(this.el).html(this.get_templateHTML());

        new UniverseListView({
            collection: this.playlists,
            el: $('#universe', this.el),
            draggable: true,
        });

        this.render();
    },
    events: {
        "click #pushdown"   : "pushdownAll",
        "click #revert"     : "revert"
    },
    displayOverlap: function(bool) {
        if (bool) {
            $('#overlapping-alert').fadeIn();
        } else {
            $('#overlapping-alert').fadeOut();
        };
    },
    pushdownAll: function() {
        var self = this;
        var invalid = this.collection.getInvalid();
        invalid.forEach(function(oc){
            if (!oc.validationError) return // conflict may have already been fixed by other pushdown
            var first = oc.getOverlappingEvents()[0];
            if (oc.get('start') > first.get('start')) {
                self.pushdown(first);
            } else {
                self.pushdown(oc);
            }
        })
    },
    pushdown: function(oc) {
        /* We assume the last dragged object is the one the user
           wants to keep in that position */
        var self = this;
        var overlapping = oc.getOverlappingEvents();
        overlapping.forEach(function(first) {
            start = oc.get('end');
            duration = first.get('end') - first.get('start');
            end = start + duration
            first.save({start: start, end: end});
            // If I stepped over another event, call myself again
            if (first.validationError) {
                self.pushdown(first);
            };
        })
    },
    revert: function() {
        this.collection.fetch({reset: true});
        this.displayOverlap(false);
    },
/*    saveEvent: function (event) {
        // we filter out the event to only store what we really need

        console.log ('saving event:', event);
        var nattr = {
            title:  event.get('title'),
            start:  moment(event.get('start')).valueOf(),
            end:    moment(event.get('end')).valueOf(),
            allDay: event.get('allDay'),
            list:   event.get('list'),
        };

        event.clear({silent:true});
        event.save(nattr);

    },*/
    render: function () {
        console.log ('render calendar', $(this.el));
        var self = this;
        this.collection = this.get_collection();
        this.opts = {"timestamp":1361784505,
                     "timezoneOffset":"0",
                     "timeScale":"agendaWeek",
                     "timeInterval":"30",
                     "weekStartDay":"0"};
        this.calendar = $('#schedule_calendar', this.$el);

        var mainHeight = document.documentElement.clientHeight - 200 - 50;

        var calendarEventSources = [
            function(start, end, callback) {
                self.collection.setQuery({criteria: {in_window: [moment(start).valueOf(), moment(end).valueOf()]}});
                self.collection.fetch({
                    success: function() {
                        console.log("Fetched Schedule!");
                        var events = self.collection.map(self.make_event);
                        console.log('Returning events #', events.length);
                        callback(events)
                    },
                    error: function(e) {
                        throw new Error("Cannot fetch Schedule.");
                    },
                });
            },
        ].concat(self.historical_events);

        this.calendar.fullCalendar({
            header: {
                left: 'prev, next, today',
                center: 'title',
                right: 'agendaDay, agendaWeek, month'
            },
            defaultView: this.opts.timeScale,
            slotMinutes: parseInt(this.opts.timeInterval),
            firstDay: this.opts.weekStartDay,
            editable: true,
            droppable: true,
            allDaySlot: false,
            axisFormat: 'H:mm',
            timeFormat: {
                agenda: 'H:mm{ - H:mm}',
                month: 'H:mm{ - H:mm}'
            },
            contentHeight: mainHeight,
            theme: true,
            lazyFetching: true,
            serverTimestamp: parseInt(this.opts.timestamp, 10),
            serverTimezoneOffset: parseInt(this.opts.timezoneOffset, 10),

            eventSources: calendarEventSources,

            //callbacks (in full-calendar-functions.js)
            viewDisplay: function ( view ) {
                view_name = view.name;

                if(view.name === 'agendaDay' || view.name === 'agendaWeek') {

                    var calendarEl = this;

                    var select = $('<select class="schedule_change_slots input_select"/>')
                        .append('<option value="1">1m</option>')
                        .append('<option value="5">5m</option>')
                        .append('<option value="10">10m</option>')
                        .append('<option value="15">15m</option>')
                        .append('<option value="30">30m</option>')
                        .append('<option value="60">60m</option>')
                        .change(function(){
                            var slotMin = $(this).val();
                            var opt = view.calendar.options;
                            var date = $(calendarEl).fullCalendar('getDate');

                            opt.slotMinutes = parseInt(slotMin);
                            opt.defaultView = view.name;
                            // event sources are not kept in the options, I don't know
                            //  if there's a way to retrieve them
                            opt.eventSources = calendarEventSources;

                            //re-initialize calendar with new slotmin options
                            $(calendarEl)
                                .fullCalendar('destroy')
                                .fullCalendar(opt)
                                .fullCalendar( 'gotoDate', date );

                            /** TODO: save view config
                             *
                            //save slotMin value to db
                            var url = '/Schedule/set-time-interval/format/json';
                            $.post(url, {timeInterval: slotMin});
                            */
                        });

                    var topLeft = $(view.element).find("table.fc-agenda-days > thead th:first");

                    select.width(topLeft.width())
                        .height(topLeft.height());

                    topLeft.empty()
                        .append(select);

                    var slotMin = view.calendar.options.slotMinutes;
                    $('.schedule_change_slots option[value="'+slotMin+'"]').attr('selected', 'selected');
                }

                if(($("#add-show-form").length == 1) && ($("#add-show-form").css('display')=='none') && ($('.fc-header-left > span').length == 5)) {

                    //userType is defined in bootstrap.php, and is derived from the currently logged in user.
                    if(userType == "A" || userType == "P"){
                        makeAddShowButton();
                    }
                }

                /* FIXME
                //save view name to db
                var url = '/Schedule/set-time-scale/format/json';
                $.post(url, {timeScale: view.name});
            */
            },
            dayClick: dayClick,

            eventRender: function (event, element, view) {
                element.tooltip({
                    trigger: 'click',
                    placement: 'left',
/*                    title: function () {
                        console.log ("creating tooltip", model);
                        var model = self.collection.get(event._id);
                        var playlist = model.get('playlist');
                        var target = document.createElement('div');
                        var view = new MediaListView({model: playlist, type: 'playlist-fixed', el: $(target)});
                        return view.el.html();
                    },
*/
                });

                eventRender(event, element, view);

            },

            eventAfterRender: function (event, element, view) {
              var ocurrence = new OccurrenceView({
                el: element,
                id: event._id,
                model: event.model,
                collection: self.collection,
                calendar: self.calendar
              });
              eventAfterRender(event, element, view);
            },
            eventDrop: function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
                var data = self.checkOverlap(event);
                event.start = data.start.toDate();
                event.end = data.end.toDate();
                self.calendar.fullCalendar('updateEvent', event);
                event.model.save({start: data.start.valueOf(), end: data.end.valueOf()});
            },
            eventResize: eventResize,
            drop: function(date, allDay) {
                var list  = self.playlists.get(this.id);

                console.log ('drop->', self.collection.pluck('end'));

                var start = moment(date);
                var end   = moment(start);

                end.add('ms', list.get('duration'));

                var times = self.checkOverlap({start: start, end: end});

                var event = {
                    title:  list.get('name'),
                    start:  times.start.valueOf(), end: times.end.valueOf(),
                    playlist:   list.get('_id'),
                    allDay: allDay,
                };

                console.log ('to save', event);
                var item = self.collection.create (event);
                console.log (this, list, event, item);
            }
        });

                                             /*
            eventRender: function(event, element) {
                var model = self.collection.where({list: event.list})[0];

                element.tooltip({
                    trigger: 'click',
                    placement: 'left',
                    title: function () {
                        var target = document.createElement('div');
                        var view = new MediaListView({model: model,
                                                      noSearch:true,
                                                      el: target});
                        return view.render().el;
                    },
                });
            }
                                             */

        self.collection.bind('add reset remove change', this.reload, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('overlap', this.displayOverlap, this);

        return this;
    },
});
