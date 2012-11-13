window.MediaListView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        var medias = this.model.models;
        var len = medias.length;
        var mediaNames = _.map(medias, function (w) {return w.attributes.name;});

        $(this.el).html(this.template());

        for (var i = 0; i < len; i++) {
            $('.table', this.el).append(new MediaListItemView({model: medias[i]}).render().el);
        }

        $('.tbody', this.el).sortable();
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
