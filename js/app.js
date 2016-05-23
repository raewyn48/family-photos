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
    
//  this.showThumbnail = ko.observable(true);

  this.keywords = ko.computed(function() {
    return self.editables.Keywords();    
  });
    
  this.isLandscape = ko.computed(function() {
    if (self.width > self.height) return true;
    else return false;
  });
  
  /* Estimate the number of lines needed to view all of the content */
  this.descriptionLines = ko.computed(function() {
    return parseInt((self.editables.Description().length / 60) * 3);
  });
};

var Tag = function(keyword, count) {
  var self = this;
  
  this.keyword = ko.observable(keyword);
  this.count = ko.observable(count);
  this.selected = ko.observable(false);
  
  this.keywordWithCount = ko.computed(function() {
    return self.keyword() + ' (' + self.count() + ')';
  });
  
};

var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]);
  this.appStatus = ko.observable('');
  this.filterBy = ko.observable('');
  this.enteredKeyword = ko.observable('');
  this.tags = ko.observableArray([]);
  this.dataLoaded = ko.observable(false);
  this.selectedPhoto = ko.observable();

  var offset = 0;
  var limit = 20;
  
  var allKeywords = [];
  var fetchedPhotos = [];
  var keywordCount = {};
  

  (function getMoreData(offset) {
    $.getJSON("/photo_api/slim/photos?offset=" + offset + "&limit=" + limit, function(data) {
      if (data) {
        var fetchedPhotos = $.map(data, function(photo) { return new Photo(photo) });
        self.photoList.push.apply(self.photoList, fetchedPhotos);
                
        data.forEach(function(photoData) {
          photoData.Keywords.forEach(function(keyword) {
            var keywordIndex = allKeywords.indexOf(keyword)
            if (keywordIndex < 0) {
              allKeywords.push(keyword);
              keywordCount[keyword] = 1;
            }
            else {
              keywordCount[keyword]++;
            }
          });
        });
        self.tags($.map(allKeywords.sort(), function(keyword) { return new Tag(keyword, keywordCount[keyword]) }));

        fetchedPhotos = [];

        offset += limit;
        getMoreData(offset);
      }
      else {
        /* Data is all loaded */
        self.dataLoaded(true);
        
      }
    });
  })(offset);
  
  this.setFilter = function(tag) {
    self.filterBy(tag.keyword());
  }
    
  
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
    self.selectedPhoto().editables.Keywords.splice(i,1);
  };
  
  this.filterThumbnails = function() {
    keyword = self.filterBy();
    self.photoList().forEach(function(photo) {
      photo.showThumbnail(photo.editables.Keywords().indexOf(keyword) >= 0);
    });
  }
};

ko.applyBindings(new ViewModel());
