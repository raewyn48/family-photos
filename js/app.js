var Photo = function(data) {
  self = this;
  this.editables = {
    SourceFile: ko.observable(data.SourceFile),
    FileName: ko.observable(data.FileName),
    Title: ko.observable(data.Title),
    Description: ko.observable(data.Description),
    Keywords:  ko.observableArray(data.Keywords ? [].concat(data.Keywords) : []) // Make sure it's an array
  }
  this.thumbnailImage = ko.observable('data:image/jpeg;' + data.ThumbnailImage.replace(/^base64\:/,'base64,'));
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.enteredKeyword = ko.observable('');
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;
  
  this.orientation = ko.computed(function() {
    console.log(this.width, this.height);
    if (this.width > this.height) return 'landscape';
    return 'portrait';
  }, this);
   
}

var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]);
  this.appStatus = ko.observable('');

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

  this.closePhoto = function() {
    self.savePhoto();
    self.selectedPhoto(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhoto();
  }
  
  this.saveField = function(data, event) {
  }
  
  this.savePhoto = function() {
    self.appStatus('saving');
    var data = ko.toJSON(self.selectedPhoto().editables);
    console.log(data);
    $.post("/photo_api/update.php", {json: data}, function(returnedData) {
      console.log(returnedData);
      self.appStatus('');
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
  
  this.removeKeyword = function(i) {
    // console.log("removing " + i);
    // console.log(ko.toJS(self.selectedPhoto().editables.Keywords()));
    self.selectedPhoto().editables.Keywords.splice(i,1);
    // console.log(ko.toJS(self.selectedPhoto().editables.Keywords()));
  }


};

ko.applyBindings(new ViewModel());
