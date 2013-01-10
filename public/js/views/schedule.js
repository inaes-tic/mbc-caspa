window.ScheduleView = Backbone.View.extend({
    el: $("#content"),
    get_templateHTML: function () {
        return template.schedule();
    },
    get_collection: function () {
        return this.collection;
    },
    addOne: function (item) {
        console.log ("Calendar addOne", item);
        event = item.get('event');
	$('#calendar', this.el).fullCalendar('renderEvent', event, true);
    },
    addAll: function() {
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
    render: function () {
        console.log ('render calendar', $(this.el));
        var self = this;
        this.collection = this.get_collection();

        $('#calendar', this.el).fullCalendar({
	    editable: true,
            droppable: true,
            disableResizing: true,
            aspectRatio: 2,
            drop: function(date, allDay) {
                var list  = Universe.get(this.id);
                var start = moment(date);
                var end   = moment(start);

                end.add('ms', list.get('duration'));
                var event = {
                    title: list.get('name'),
                    start: start.unix(),
                    end:     end.unix(),
                    allDay: allDay,
                };

                var item = self.collection.create ({list: list, event: event});
                console.log (this, list, event, item);
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
	    ],
            eventRender: function(event, element) {
                console.log ('----o---', element);


                element.tooltip({
                    trigger: 'click',
                    placement: 'left',
                    title: function () {
                        var target = document.createElement('div');
                        var view = new MediaListView({model: event.model,
                                                      noSearch:true,
                                                      el: target});
                        return view.render().el;
                    },
                });
            }
        });

        setTimeout (function () {
            $('table', this.el).addClass("table table-bordered");
            self.addAll();
        }, 500);


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
