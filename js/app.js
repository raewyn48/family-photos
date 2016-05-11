var EditableFields = function(data) {
  this.SourceFile = ko.observable(data.SourceFile);
  this.FileName = ko.observable(data.FileName);
  this.Title = ko.observable(data.Title);
  this.Description = ko.observable(data.Description);
  this.Keywords = ko.observableArray([].concat(data.Keywords)); // Make sure it's an array
};

var Photo = function(data) {
  self = this;
  this.editables = new EditableFields(data);
  this.thumbnailImage = ko.observable('data:image/jpeg;' + data.ThumbnailImage.replace(/^base64\:/,'base64,'));
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.enteredKeyword = ko.observable();
  
  this.saveKeyword = function() {
    self.editables.Keywords.push(self.enteredKeyword);
    self.enteredKeyword('');
  };
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

};

ko.applyBindings(new ViewModel());
