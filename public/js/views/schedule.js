window.ScheduleView = Backbone.View.extend({
    el: $("#content"),
    get_templateHTML: function () {
        return template.schedule();
    },
    get_collection: function () {
        return this.collection;
    },
    addOne: function (event) {
        console.log ("Calendar addOne", event);
        var fce = _(event.attributes).clone();
	this.calendar.fullCalendar('renderEvent', fce, true);
    },
    addAll: function() {
	this.calendar.fullCalendar('removeEvents');
        this.collection.each(this.addOne);
    },
    initialize: function () {
        var self = this;
        self.collection = this.get_collection();

        $(this.el).html(this.get_templateHTML());

        new UniverseListView({
            collection: Universe,
            el: $('#universe', this.el),
            draggable: true,
        });

        this.render();
    },
/*    saveEvent: function (event) {
        // we filter out the event to only store what we really need

        console.log ('saving event:', event);
        var nattr = {
            title:  event.get('title'),
            start:  moment(event.get('start')).unix(),
            end:    moment(event.get('end')).unix(),
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
            lazyFetching: false,
            serverTimestamp: parseInt(this.opts.timestamp, 10),
            serverTimezoneOffset: parseInt(this.opts.timezoneOffset, 10),

            //callbacks (in full-calendar-functions.js)
            viewDisplay: viewDisplay,
            dayClick: dayClick,
            eventRender: function (event, element, view) {
                var model = self.collection.where({list: event.list})[0];

                element.tooltip({
                    trigger: 'click',
                    placement: 'left',
                    title: function () {
                        console.log ("creating tooltip", model);
                        var target = document.createElement('div');
                        var view = new MediaListView({model: model,
                                                      noSearch:true,
                                                      el: target});
                        return view.render().el;
                    },
                });

                eventRender(event, element, view);
            },
            eventAfterRender: eventAfterRender,
            eventDrop: function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
                var start = moment(event.start);
                var end = moment(event.end);
                self.collection.find(function(e){ return e.get("_id") == event._id }).set(
                    {start: start.unix(), end: end.unix()}).save({start: start.unix(), end: end.unix()});
            },
            eventResize: eventResize,
            drop: function(date, allDay) {
                var list  = Universe.get(this.id);
                console.log ('drop->', self.collection.pluck('end'));

                var start = moment(date);
                var end   = moment(start);

                end.add('ms', list.get('duration'));
                var event = {
                    title:  list.get('name'),
                    list:   list.get('_id'),
                    start:  start.unix(), end: end.unix(),
                    allDay: allDay,
                };

                console.log ('to save', event);
                var item = self.collection.create (event);
                console.log (this, list, event, item);
            },
	    events: [
		{
		    title: 'WALLKINTUN SALE AL AIRE !',
		    start: new Date(2012, 11, 7, 22, 0),
		    end:   new Date(2012, 11, 8, 6, 0),
                    allDay: false,
		},
            ]
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
            });
                                             */

        _.bindAll(this,
                  'addOne',
                  'addAll'
                 );

        self.collection.bind('add',   this.addOne, this);
        self.collection.bind('reset', this.addAll, this);
//        self.collection.bind('remove',this.checkEmpty, this);
        self.collection.bind('all',   function (e, a) {console.log('got: ' + e, a);}, this);
        self.collection.bind('update',this.update, this);

        return this;
    },
});
