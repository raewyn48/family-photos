var Photo = function(data) {
  self = this;
  this.editables = {
    id: ko.observable(data.id),
    SourceFile: ko.observable(data.SourceFile),
    FileName: ko.observable(data.FileName),
    Title: ko.observable(data.Title),
    Description: ko.observable(data.Description),
    Keywords:  ko.observableArray(data.Keywords ? [].concat(data.Keywords) : []) // Make sure it's an array
  }
  this.thumbnailImage = ko.observable(data.ThumbnailImage);
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.enteredKeyword = ko.observable('');
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;
  
  this.showThumbnail = ko.observable(true);
    
  this.isLandscape = ko.computed(function() {
    if (self.width > self.height) return true;
    else return false;
  });
  
  /* Estimate the number of lines needed to view all of the content */
  this.descriptionLines = ko.computed(function() {
    return parseInt((self.editables.Description().length / 60) * 3);
  });
     
}

var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]);
  this.appStatus = ko.observable('');
  this.filterBy = ko.observable('');
  
  var offset = 0;
  var limit = 20;

  (function getMoreData(offset) {
    $.getJSON("/photo_api/slim/photos?offset=" + offset + "&limit=" + limit, function(data) {
      if (data) {
        data.forEach(function(photoData) {
          self.photoList.push(new Photo(photoData, self));
        });
        offset += limit;
        getMoreData(offset);
      }
    });
  })(offset);
  
  this.selectedPhoto = ko.observable();
  
  this.selectPhoto = function(whichPhoto) {
    //console.log(ko.toJS(whichPhoto));
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
    var photoID = self.selectedPhoto().editables.id();
      $.ajax({
        type: "PUT",
        url: "/photo_api/slim/photos",
        data: data,
        success: function(returnedData) {
          self.appStatus('');
        }
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
  };
  
  this.filterThumbnails = function() {
    keyword = self.filterBy();
    self.photoList().forEach(function(photo) {
      photo.showThumbnail(photo.editables.Keywords().indexOf(keyword) > 0);
    });
  }
    


};

ko.applyBindings(new ViewModel());
