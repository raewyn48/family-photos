var Photo = function(data) {
  
  this.fileName = ko.observable(data.FileName);
  console.log(data.thumbnailImage);
  this.thumbnailImage = ko.observable('data:image/jpeg;' + data.ThumbnailImage.replace(/^base64\:/,'base64,'));
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
  
  this.viewingPhoto = ko.observable();
  
  this.viewPhoto = function(whichPhoto) {
    self.viewingPhoto(whichPhoto);
  }

};

ko.applyBindings(new ViewModel());
