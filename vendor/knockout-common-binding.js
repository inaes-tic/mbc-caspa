ko.bindingHandlers.addOnEnter = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        var value = valueAccessor();
        $(element).keypress(function(event) {
            keyCode = (event.which ? event.which : event.keyCode);
            if (keyCode === 13) {
                value.call(this, viewModel);
                return false;
            }
            return true;
        });
    },
    update: function(element, valueAccesor, allBindingsAccessor, viewModel) {
    }
};

ko.bindingHandlers.jqSwitch = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var bindings = allBindingsAccessor();
        var value = valueAccessor();
        var currentValue = ko.utils.unwrapObservable(value.value);

        if(bindings.options==undefined){
            $(element).toggleSwitch(currentValue);
        } else {
            var called=0;
            bindings.optionsAfterRender = function(option, item){
                called++;
                if(called == 2) {
                   $(element).val(currentValue);
                   $(element).toggleSwitch();
                }
            };
        }

    },
    update: function(element, valueAccessor, allBindingsAccessor) {
        var value = valueAccessor();
        var currentValue = ko.utils.unwrapObservable(value.value);
        $(element)[0].val(currentValue);
    }
};

ko.bindingHandlers.renderWidget = {
   init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var type;

        // Available widget templates
        var available_types = ['input', 'switch', 'spinner', 'list', 'object'];
        var default_type = 'input';

        // use value sent or type from viewmodel
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);

        if(!_.isEmpty(valueUnwrapped)) {
            type = valueUnwrapped;
        } else if(bindingContext.$data.widget()) {
            type = bindingContext.$data.widget();
        } else {
            console.error("Error on binding: didnt get any widget type");
            return;
        }

        //validate template
        var tpl_name =  (available_types.indexOf(type) != -1)? type : default_type;

        // render tpl to element and pass all the binding context
        ko.renderTemplate(tpl_name, bindingContext, {}, element, 'replaceNode');
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
};

ko.bindingHandlers.listWidget = {
   init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var self = bindingContext;
        var value = valueAccessor();
        self.itemToAdd = ko.observable("");
        self.selectedItems = ko.observableArray([]);
        self.addItem = function () {
            var valueUnwrapped = ko.unwrap(value);
            if ((self.itemToAdd() != "") && (valueUnwrapped.indexOf(self.itemToAdd()) < 0)) {
                valueUnwrapped.push(self.itemToAdd());
                value(valueUnwrapped);
                value.notifySubscribers();
            }
            self.itemToAdd("");
        };

        self.removeSelected = function () {
            var valueUnwrapped = ko.unwrap(value);
            value(_.difference(valueUnwrapped, self.selectedItems()));
            self.selectedItems([]);
        };

        var addValueAccessor = function() {
            return self.addItem;
        }

        //This makes the widget add an element after pressing enter as we have button with type=submit
        ko.bindingHandlers.submit.init(element, addValueAccessor, allBindings, viewModel, bindingContext);
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
};

ko.bindingHandlers.objectWidget = {
    createObj :  function(prop) {
        var  o = {};
        for(f in prop) {
            var k = prop[f].key();
            var v = prop[f].val();
            if(k && v) {
                o[k] = v;
            }
        }
        return o;
    },

    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);
        bindingContext.dict = new Dictionary(valueUnwrapped);
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = valueAccessor();
        var o = ko.bindingHandlers.objectWidget.createObj(bindingContext.dict.items());
        value(o);
    }
};

function DictionaryItem(key, val) {
    this.key = ko.observable(key);
    this.val = ko.observable(val);
}

function Dictionary(data) {
    this.items = ko.observableArray([]);
    for (field in data) {
        if (data.hasOwnProperty(field)) {
            this.items.push(new DictionaryItem(field, data[field]));
        }
    }

    this.addItem = function(item) {
        this.items.push(new DictionaryItem(item));
    }.bind(this);

    this.removeItem = function(item) {
            this.items.remove(item);
    }.bind(this);
}
