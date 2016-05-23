ko.bindingHandlers.filter = {
    init: function(element, valueAccessor) {
      $(element).show();
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var filterKeyword = bindingContext.$parent.filterBy();
      if (filterKeyword) {
        var keywordList = ko.unwrap(valueAccessor());
        if (keywordList.indexOf(filterKeyword) < 0) {
          $(element).hide();
        }
        else {
          $(element).show();
        }
      }
    }
};
