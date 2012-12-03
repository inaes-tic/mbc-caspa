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
		    title: 'WALLKINTUN SALE AL AIRE !',
		    start: new Date(2012, 11, 7, 22, 0),
		    end:   new Date(2012, 11, 8, 6, 0),
                    allDay: false,
		},
	    ]
        });

        setTimeout (function () {
            $('#calendar table', this.el).addClass("table table-bordered");
        }, 500);
        return this;
    },
});
