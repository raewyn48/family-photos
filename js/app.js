var Photo = function(data) {
  self = this;
  this.editables = {
    SourceFile: ko.observable(data.SourceFile),
    FileName: ko.observable(data.FileName),
    Title: ko.observable(data.Title),
    Description: ko.observable(data.Description),
    Keywords: ko.observableArray([].concat(data.Keywords)) // Make sure it's an array
  }
  this.thumbnailImage = ko.observable('data:image/jpeg;' + data.ThumbnailImage.replace(/^base64\:/,'base64,'));
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.enteredKeyword = ko.observable('');
   
}

var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]);

  $.getJSON("/photo_api/json/all.json", function(data) {
    data.forEach(function(photoData) {
      self.photoList.push(new Photo(photoData));
    });
  });
  
  this.selectedPhoto = ko.observable();
  
  this.selectPhoto = function(whichPhoto) {
    console.log(ko.toJS(whichPhoto));
    self.selectedPhoto(whichPhoto);
  }

  this.deselectPhoto = function() {
    self.selectedPhoto(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhoto();
  }
  
  this.saveField = function(data, event) {
  }
  
  this.savePhoto = function() {
    var data = ko.toJSON(self.selectedPhoto().editables);
    $.post("/photo_api/update.php", {json: data}, function(returnedData) {
      console.log(returnedData);
    });
  }
  
  this.onEnter = function(d,e) {
    if (e.keyCode === 13) {
      var newWord = self.selectedPhoto().enteredKeyword();
      self.selectedPhoto().editables.Keywords.push(newWord);
      self.selectedPhoto().enteredKeyword(null);
    }
    return true;
  };


};

ko.applyBindings(new ViewModel());
