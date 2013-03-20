//create a draggable that is appropriate for dropping into a sortable
ko.bindingHandlers.drag = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        //set meta-data
        ko.utils.domData.set(element, "ko_dragItem", valueAccessor());
       
        
        //combine options passed into binding (in dragOptions binding) with global options (in ko.bindingHandlers.drag.options)
        var options = ko.utils.extend(ko.bindingHandlers.drag.options, allBindingsAccessor().dragOptions);
        
        //initialize draggable
        $(element).draggable(options);
    },
    options: { 
        connectToSortable: "." + ko.bindingHandlers.sortable.connectClass,
        helper: "clone"        
    }   
};

//set up a receive handler for sortable that recognizes drag items
ko.bindingHandlers.sortable.options.receive = function(event, ui) {
    var el = ui.item[0],
        item = ko.utils.domData.get(el, "ko_dragItem"),
        draggable, targetParent, targetIndex;

    if (item) {
        targetParent = ko.utils.domData.get(this, "ko_sortList");
        draggable = $(this).children(".ui-draggable");
        targetIndex = draggable.index();
        
        if (targetIndex >= 0) { 
            targetParent.splice(targetIndex, 0, item);
            draggable.remove();
        }    
    }
};
    

