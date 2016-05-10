var Photo = function(data) {
  
  this.fileName = ko.observable(data.FileName);
  this.thumbnailImage = ko.observable('data:image/jpeg;' + data.ThumbnailImage.replace(/^base64\:/,'base64,'));
  this.title = ko.observable(data.Title);
  this.description = ko.observable(data.Description)
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
}

var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]);

  $.getJSON("/photo_api/json/all.json", function(data) {
    data.forEach(function(photoData) {
      self.photoList.push(new Photo(photoData));
    });
  });
  
  this.selectedPhoto = ko.observable(this.photoList()[0]);
  
  this.selectPhoto = function(whichPhoto) {
    self.selectedPhoto(whichPhoto);
  }

  this.deselectPhoto = function() {
    self.selectedPhoto(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhoto();
  }

};

ko.applyBindings(new ViewModel());
