window.MediaListView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        var medias = this.model.models;
        var len = medias.length;
        var mediaNames = _.map(medias, function (w) {return w.attributes.file;});

        $(this.el).html(this.template());

        for (var i = 0; i < len; i++) {
            var item = new MediaListItemView({model: medias[i]}).render().el;
            item.setAttribute ("id", medias[i].get('_id'));
            $('.table', this.el).append(item);
        }

        $('.tbody', this.el).sortable({
            update: function (e, ui) {
                _($(this).sortable('toArray')).each(function (order, index) {
                    var media = mediaList.get(order);
                    media.save({"order": index}, {notify: "others"});
                });
            }
        });
        $('#search', this.el).html(new SearchView({source : mediaNames,
                                                   target : '.table'}).render().el);
//        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});

window.MediaListItemView = Backbone.View.extend({

    tagName: "tr",

    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },
    events: {
        "click" : "onClick"
    },
    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    onClick: function () {
//        $('.media-name', this.el).click();
        console.log($('a', this.el));

    }
});
