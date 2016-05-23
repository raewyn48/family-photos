var Photo = function(data, tagList) {
  var self = this;

  this.id = ko.observable(data.id);
  this.FileName = ko.observable(data.FileName);
  this.Title = ko.observable(data.Title);
  this.Description = ko.observable(data.Description);

  if (data.Keywords == '') data.Keywords = [];
  
  // this.tags is an array of Tags
  this.tags = ko.observableArray($.map(data.Keywords, function(keyword) { return tagList.addTag(keyword) }));

  /* return an array of text keywords */
  this.Keywords = ko.computed(function() { return $.map(self.tags(), function(tag) { return tag.keyword() } ) })
  
  this.thumbnailImage = ko.observable(data.ThumbnailImage);
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;

  this.enteredKeyword = ko.observable(''); 
    
      
  this.isLandscape = ko.computed(function() {
    if (self.width > self.height) return true;
    else return false;
  });
  
  /* Estimate the number of lines needed to view all of the content */
  this.descriptionLines = ko.computed(function() {
    return parseInt((self.Description().length / 60) * 3);
  });
  
  this.toJSON = function() {
    var saveFields = ['id', 'FileName', 'Title', 'Description', 'Keywords'];
    return ko.toJSON($.map(saveFields, function(field) { return self[field] }));
  };
  
  // this.editables.Keywords.subscribe(function(change) {
    // change.forEach(function(keywordChange) {
      // if (keywordChange.status == 'deleted') {
        // // Need some link between this photo's keywords and the main keyword/tag list
      // }
    // });
    // console.log(change[0].status, change[0].index, change[0].value);
  // }, null, "arrayChange");
  
};

var Tag = function(keyword, count) {
  var self = this;
  
  this.keyword = ko.observable(keyword);
  this.count = ko.observable(count);
  this.selected = ko.observable(false);
  
  this.keywordWithCount = ko.computed(function() {
    return self.keyword() + ' (' + self.count() + ')';
  });
  
  this.increment = function() {
    self.count(self.count()+1);
  }
  
  this.decrement = function() {
    self.count(self.count()-1);
    return self.count();
  }

};

var TagList = function() {
  var self = this;
  this.tags = ko.observableArray([]);
  
  this.addTag = function(keyword) {
    if (existing = ko.utils.arrayFirst(self.tags(), function(item) { return item.keyword()==keyword }) ) {
      existing.increment();
      return existing;
    }
    else {
      newTag = new Tag(keyword, 1);
      self.tags.push(newTag);
      self.tags.sort(function (left, right) { return left.keyword() == right.keyword() ? 0 : (left.keyword() < right.keyword() ? -1 : 1) });
      return newTag;
    }
  };
  
  this.removeTag = function(keyword) {
    if (tag = ko.utils.arrayFirst(self.tags(), function(item) { return item.keyword()==keyword }) ) {
      if (tag.decrement() == 0) {
        self.tags.remove( tag );
      }
    }
      
  }
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
  this.tagList = new TagList();
	
  var offset = 0;
  var limit = 20;
  
  var allKeywords = [];
  var fetchedPhotos = [];
  var keywordCount = {};
  
  var numPages = 2;
  
  (function getMoreData(offset,page) {
    if (page <= numPages) {
      $.getJSON("/photo_api/slim/photos?offset=" + offset + "&limit=" + limit, function(data) {
        if (data) {
          var fetchedPhotos = $.map(data, function(photo) { return new Photo(photo, self.tagList) });
          self.photoList.push.apply(self.photoList, fetchedPhotos);
          
          offset += limit;
          getMoreData(offset, page+1);
        }
        else {
          /* Data is all loaded */
          self.dataLoaded(true);
        }
      });
    }
  })(offset, 1);
  
  this.keywordList = ko.computed(function() {
    //console.log(ko.toJSON(self.tagList.tags));
    return self.tagList.tags();
  });
  
  this.setFilter = function(tag) {
    self.filterBy(tag.keyword());
  };
    
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
    var data = self.selectedPhoto().toJSON();
    console.log(data);
    var photoID = self.selectedPhoto().id();
    $.ajax({
      type: "PUT",
      url: "/photo_api/slim/photos",
      data: data,
      success: function(returnedData) {
        console.log(returnedData);
        self.appStatus('');
      }
    });
  }
  
  this.onEnter = function(d,e) {
    if (e.keyCode === 13) {
      var newWord = self.selectedPhoto().enteredKeyword();
      self.selectedPhoto().tags.push(self.tagList.addTag(newWord));
      self.selectedPhoto().enteredKeyword(null);
   }
    return true;
  };
  
  this.removeKeyword = function(i) {
    removedTagArray = self.selectedPhoto().tags.splice(i,1);
    self.tagList.removeTag(removedTagArray[0].keyword());
  };
  
  this.filterThumbnails = function() {
    keyword = self.filterBy();
    self.photoList().forEach(function(photo) {
      photo.showThumbnail(photo.editables.Keywords().indexOf(keyword) >= 0);
    });
  }
};

ko.applyBindings(new ViewModel());
