ko.bindingHandlers.addOnEnter = {
    init: function(element, valueAccessor) {
        var value = valueAccessor();
        $(element).keypress(function(event) {
            keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === 13) {
                    value.call(this);
                    return false;
                }
                return true;
            });
        },
        update: function(element, valueAccesor) {
    }
};
