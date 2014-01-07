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
        var available_types = ['input', 'switch', 'spinner'];
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
