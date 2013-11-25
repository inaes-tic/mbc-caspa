window.TagTransformView = function (options) {
    var self = this;
    options = options || {};
    var tagCollection;
    var searchTagCollection = new Media.TagCollectionPageable();
    var page_size = options['page_size'] || (searchTagCollection instanceof PageableCollection)?searchTagCollection.state.pageSize:10;
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    var default_type = 'tag-transform';
    var type = 'type' in options ? options['type'] : default_type;

    if(type == default_type ) {
        var transformModel = model.get('transform');
        if(transformModel) {
            transformModel.fetchRelated('tags');
            tagCollection = transformModel.get('tags');
        }
    }

    el.html(template.tag({type: type}));

    var TagItemViewModel = function(id, name, color) {
            this.id = ko.observable(id);
            this.name = ko.observable(name);
            this.color = ko.observable(color);
            this.displayName = ko.dependentObservable(function() {
                return this.name() + " [" + this.color() + "]";
            }, this);
    };

    var TagsViewModel = kb.ViewModel.extend({
        constructor: function() {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            self.tagId = ko.observable();
            this.tags =  kb.collectionObservable(tagCollection, {
            });

            this.removeRelatedTag =  function (vm) {
                if(vm._id()) {
                    var tagModel = tagCollection.get(vm._id());
                    tagCollection.remove(tagModel);
                    transformModel.save()
                    tagModel.get('transforms').remove(transformModel);
                    tagModel.save();
                } else {
                    console.warn('Id is not valid');
                }
            };

            this.addRelatedTag = function () {
                var model;

                var onSuccess = function(tagModel) {
                    tagCollection.add(tagModel);
                    transformModel.save();
                    tagModel.get('transforms').add(transformModel);
                    tagModel.save();
                };

                if(self.selectedTagId()) {
                    if(! tagCollection.get(self.selectedTagId())) {
                        var attr = { _id: self.selectedTagId(), name: self.tagName(), color: self.tagColor() };
                        //XXX if i just make new Media.Tag setting id and then fetch brakes something
                        tagCollection.create(attr, { success:  function(tagModel) {
                            transformModel.save();
                            tagModel.get('transforms').add(transformModel);
                            tagModel.save();
                        }});
                        self.clearAddForm();
                    } else {
                        console.warn('Tag is already related');
                    }
                } else {
                    if(self.tagName()) {
                        model = new Media.Tag({ name: self.tagName(), color: self.tagColor() });
                        model.save({}, { success: onSuccess });
                        self.clearAddForm();
                    } else {
                        console.warn('Tag is empty');
                    }
                }
            };

            this.notempty = ko.computed({
                read: function () {
                    return (!self.tags.length);
                }
            });

            this.toggleAddForm = function(){
                self.showAddForm(!self.showAddForm());
            };

            this.selectedTagId = ko.computed({
                read: function() {
                    return self.tagId();
                },

                write: function(view_model) {
                    var _id = view_model ? view_model.id() : null;
                    self.tagId(_id);
                    if (!view_model) {
                        return;
                    }

                    var m = searchTagCollection.get(_id);
                    if (m) {
                        self.tagColor(m.get('color'));
                        self.tagName(m.get('name'));
                    } else {
                        self.tagColor(view_model.color());
                        self.tagName(view_model.name());
                    }
                },
            }, self);
        },
        tagName:  ko.observable(''),
        tagColor: ko.observable(''),
        showAddForm: ko.observable(false),
        clearAddForm: function () {
            this.tagName('');
            this.tagColor('');
            $('.tag-input', this.el).val('');
        },
        tagsName: ko.observableArray(),
        getServerTags:  function (searchTerm, sourceArray) {
            var result = [];
            query_obj = { text : searchTerm };
            searchTagCollection.setQuery(query_obj, page_size);
            searchTagCollection.fetch({
                success: function() {
                    _.map(
                        searchTagCollection.toJSON(),
                        function(model) {
                            result.push(new TagItemViewModel(model._id, model.name, model.color));
                        }
                    );
                    if (result.length == 0) {
                        result.push(new TagItemViewModel(null, searchTerm, ''));
                    }
                    sourceArray(result);
                }
            });
        },
    });

    ko.applyBindings(new TagsViewModel(), el[0]);

    this.destroyView = function() {
    };

    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };
};

window.TagView = function(options){
    var self = this;
    options = options || {};
    var model = options['model'];
    var el = options['el'] || $('#content');
    this.el = el;

    var default_type = 'tag-transform';
    var type = 'type' in options ? options['type'] : default_type;

    var default_pagination = 'endless';
    var pagination = 'pagination' in options ? options['pagination'] : default_pagination;

    var config = 0;
    var default_facets = appCollection.at(config).get('Search').Tags.facets;
    var fulltext_fields = appCollection.at(config).get('Search').Tags.fulltext;
    var facets = 'facets' in options ? options['facets'] : default_facets;

    var default_search_type = 'server';
    var search_type = 'search_type' in options ? options['search_type'] : default_search_type;

    el.html(template.tag({type: type}));

    var tagCollection = new Media.TagCollectionPageable();
//    var tagCollection = new Media.TagCollection();
    tagCollection.fetch();

    var TagItemViewModel = kb.ViewModel.extend({
        constructor: function(model) {
            var self = this;
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            this.tagEditName = ko.observable('');
            this.tagEditColor = ko.observable('');
            this.showEditForm = ko.observable(false);
        }
    });

    var TagsViewModel = kb.ViewModel.extend({
        constructor: function() {
            kb.ViewModel.prototype.constructor.apply(this, arguments);
            var self = this;

            this.tags =  kb.collectionObservable(tagCollection, {
                view_model: TagItemViewModel,
            });

            this.notempty = ko.computed({
                read: function () {
                    return (!self.tags.length);
                }
            });

            this.setTag = function (m) {
                if(m.showEditForm() == false) {
                    m.showEditForm(true);
                    m.tagEditName(m.name());
                    m.tagEditColor(m.color());
                } else {
                    m.showEditForm(false);
                }
            };

            this.removeTag=  function (m) {
                //XXX Still need to check if used/associated
                var realModel = tagCollection.get(m._id());
                tagCollection.remove(realModel);
                realModel.destroy();
            };

            this.editTag = function(m) {
                var realModel = tagCollection.get(m._id());
                realModel.save({ name: m.tagEditName(), color: m.tagEditColor() });
                m.showEditForm(false);
            };

            this.addTag = function () {
                var model = new Media.Tag({ name: self.tagName(), color: self.tagColor() });
                model.save(
                    {},
                    { success: function (m) {
                        tagCollection.add(m);  }
                    }
                );
                self.clearAddForm();
            };
        },
        tagName:  ko.observable(''),
        tagColor: ko.observable(''),
        showAddForm: ko.observable(true),
        clearAddForm: function () {
            this.tagName('');
            this.tagColor('');
        },
    });


    ko.applyBindings(new TagsViewModel(), el[0]);

    this.search_view = new SearchView({
        el: $('#tag-search', el),
        collection: tagCollection,
        type: search_type,
        pagination: pagination,
        facets: facets
    });

    this.destroyView = function() {
    };


    this.canNavigateAway = function(options) {
        this.destroyView();
        options["ok"]();
    };
};

//jqAuto -- main binding (should contain additional options to pass to autocomplete)
//jqAutoSource -- the array to populate with choices (needs to be an observableArray)
//jqAutoQuery -- function to return choices
//jqAutoValue -- where to write the selected value
//jqAutoSourceLabel -- the property that should be displayed in the possible choices
//jqAutoSourceInputValue -- the property that should be displayed in the input box
//jqAutoSourceValue -- the property to use for the value
//jqHighLightClass
ko.bindingHandlers.jqAuto = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        var options = valueAccessor() || {},
            allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = allBindings.jqAutoValue,
            source = allBindings.jqAutoSource,
            query = allBindings.jqAutoQuery,
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
            labelProp = allBindings.jqAutoSourceLabel || inputValueProp,
            highLightClass = allBindings.jqHighLightClass || 'ui-state-highlight';

        //function that is shared by both select and change event handlers
        function writeValueToModel(valueToWrite) {
            if (ko.isWriteableObservable(modelValue)) {
               modelValue(valueToWrite );
            } else {  //write to non-observable
               if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
                        allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite );
            }
        }

        //on a selection write the proper value to the model
        options.select = function(event, ui) {
            var currentValue = $(element).val();
            var matchingItem =  ko.utils.arrayFirst(unwrap(source), function(item) {
               return unwrap(inputValueProp ? item[inputValueProp] : item) === currentValue;
            });

            if (matchingItem) {
                writeValueToModel(matchingItem);
            }
        };

        //on a change, make sure that it is a valid value or clear out the model value
        options.change = function(event, ui) {
            var currentValue = $(element).val();
            var matchingItem =  ko.utils.arrayFirst(unwrap(source), function(item) {
               return unwrap(inputValueProp ? item[inputValueProp] : item) === currentValue;
            });

            writeValueToModel(matchingItem ? matchingItem : null);
        }

        //hold the autocomplete current response
        var currentResponse = null;

        //handle the choices being updated in a DO, to decouple value updates from source (options) updates
        var mappedSource = ko.dependentObservable({
            read: function() {
                    mapped = ko.utils.arrayMap(unwrap(source), function(item) {
                        var result = {};
                        result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString();  //show in pop-up choices
                        result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString();  //show in input box
                        result.actualValue = valueProp ? unwrap(item[valueProp]) : item;  //store in model
                        return result;
                });
                return mapped;
            },
            write: function(newValue) {
                source(newValue);  //update the source observableArray, so our mapped value (above) is correct
                if (currentResponse) {
                    currentResponse(mappedSource());
                }
            },
            disposeWhenNodeIsRemoved: element
        });

        if (query) {
            options.source = function(request, response) {
                currentResponse = response;
                query.call(this, request.term, mappedSource);
            }
        } else {
            //whenever the items that make up the source are updated, make sure that autocomplete knows it
            mappedSource.subscribe(function(newValue) {
               $(element).autocomplete("option", "source", newValue);
            });

            options.source = mappedSource();
        }

        //initialize autocomplete
        $(element).autocomplete(options).data('autocomplete')._renderItem = function( ul, item ) {
            // Replace the matched text with a custom span. This
            // span uses the class found in the "highlightClass" option.
            var re = new RegExp( "(" + this.term + ")", "gi" ),
                cls = highLightClass,
                template = "<span class='" + cls + "'>$1</span>",
                label = item.label.replace( re, template ),
                $li = $( "<li/>" ).appendTo( ul );

            // Create and return the custom menu item content.
            $( "<a/>" ).attr( "href", "#" )
                       .html( label )
                       .appendTo( $li );
            return $li;
        };


    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
       //update value based on a model change
       var allBindings = allBindingsAccessor(),
           unwrap = ko.utils.unwrapObservable,
           modelValue = unwrap(allBindings.jqAutoValue) || '',
           valueProp = allBindings.jqAutoSourceValue,
           inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;

       //if we are writing a different property to the input than we are writing to the model, then locate the object
       if (valueProp && inputValueProp !== valueProp) {
           var source = unwrap(allBindings.jqAutoSource) || [];
           var modelValue = ko.utils.arrayFirst(source, function(item) {
                 return unwrap(item[valueProp]) === modelValue;
           }) || {};
       }

       //update the element with the value that should be shown in the input
       //$(element).val(modelValue && inputValueProp !== valueProp ? unwrap(modelValue[inputValueProp]) : modelValue.toString());
    }
};
