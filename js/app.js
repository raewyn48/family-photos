var Photo = function(data) {
  
  this.fileName = ko.observable(data.FileName);
}

var ViewModel = function() {
  var self = this;
  
  this.photoList = ko.observableArray([]);

  $.getJSON("/photo_api/json/all.json", function(data) {
    data.forEach(function(photoData) {
      self.photoList.push(new Photo(photoData));
    });
  });
  /*
  this.catList = ko.observableArray([]);
  
  initialCats.forEach(function(catItem) {
    self.catList.push(new Cat(catItem));
  });

  this.currentCat = ko.observable( this.catList()[0] );

  this.incrementCounter = function() {
    self.currentCat().clickCount(self.currentCat().clickCount() + 1);
  };
  
  this.changeCat = function(newCat) {
    self.currentCat(newCat);
  };
*/
};

ko.applyBindings(new ViewModel());
