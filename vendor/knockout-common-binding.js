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
        var currentValue = valueAccessor();
        var bindings = allBindingsAccessor();
        var value = bindings.value;
        if(bindings.options==undefined){
            $(element).toggleSwitch(currentValue);
        } else {
            var called=0;
            bindings.optionsAfterRender = function(option, item){
                if(item == value) {
                    $(element).val(value);
                }
                called++;
                if(called == 2) {
                   $(element).toggleSwitch(currentValue);
                }
            };
        }
    },
    update: function(element) {
    }
};
