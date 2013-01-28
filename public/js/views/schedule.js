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
	$('#calendar', this.el).fullCalendar('renderEvent', fce, true);
    },
    addAll: function() {
	$('#calendar', this.el).fullCalendar('removeEvents');
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

        $('#calendar', this.el).fullCalendar({
	    editable: true,
            droppable: true,
            disableResizing: true,
            aspectRatio: 2,
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
            eventDrop: function(event,dayDelta,minuteDelta,allDay,revertFunc) {
                console.log ('changed', event.list, event.id);

/*                if (!confirm("Are you sure about this change?")) {
                    revertFunc();
                }*/

                console.log ('drop->', event, self.collection, self.collection.pluck('end'));

                item = self.collection.where({list: event.list})[0];
                item.update(event);
                item.save();
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
