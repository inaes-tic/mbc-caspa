window.ScheduleView = Backbone.View.extend({
    el: $("#content"),
    initialize: function () {
        console.log ("rendering schedule");
        this.render();
    },
    render: function () {
        var self = this;
        $(this.el).html(template.schedule());

        new UniverseListView({
            collection: Universe,
            el: $("#universe"),
            draggable: true,
        });

	var date = new Date();
	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();

        $('#calendar', this.el).fullCalendar({
	    editable: true,
            droppable: true,
            disableResizing: true,
            aspectRatio: 2,
            drop: function(date, allDay) {
                var list = Universe.get(this.id);
                var start = moment(date);
                var end   = moment(start);

                end.add('ms', list.get('duration'));
                var event ={
                    title: list.get('name'),
                    start: start.toDate(),
                    end:   end.toDate(),
                    allDay: allDay,
                };

                var item = self.collection.create (list);
                event.model = item;

                console.log (this, list, event);
                // render the event on the calendar
		// the last `true` argument determines if the event "sticks" (http://arshaw.com/fullcalendar/docs/event_rendering/renderEvent/)
		$('#calendar', self.el).fullCalendar('renderEvent', event, true);
            },
            eventDrop: function(event,dayDelta,minuteDelta,allDay,revertFunc) {
                console.log ('changed', event.list, event.id);

                if (!confirm("Are you sure about this change?")) {
                    revertFunc();
                }
            },
	    header: {
		left: 'prev,next today',
		center: 'title',
		right: 'month,agendaWeek,agendaDay'
	    },
	    defaultView: 'agendaWeek',
	    events: [
		{
		    title: 'All Day Event',
		    start: new Date(y, m, 1)
		},
		{
		    title: 'Long Event',
		    start: new Date(y, m, d-5),
		    end: new Date(y, m, d-2)
		},
		{
		    id: 999,
		    title: 'Repeating Event',
		    start: new Date(y, m, d-3, 16, 0),
		    allDay: false
		},
		{
		    id: 999,
		    title: 'Repeating Event',
		    start: new Date(y, m, d+4, 16, 0),
		    allDay: false
		},
		{
		    title: 'Meeting',
		    start: new Date(y, m, d, 10, 30),
		    allDay: false
		},
		{
		    title: 'Lunch',
		    start: new Date(y, m, d, 12, 0),
		    end: new Date(y, m, d, 14, 0),
		    allDay: false
		},
		{
		    title: 'Birthday Party',
					start: new Date(y, m, d+1, 19, 0),
		    end: new Date(y, m, d+1, 22, 30),
		    allDay: false
		},
		{
		    title: 'Click for Google',
		    start: new Date(y, m, 28),
		    end: new Date(y, m, 29),
		    url: 'http://google.com/'
		}
	    ]
        });

        return this;
    },
});
