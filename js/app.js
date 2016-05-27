var Photo = function(data, tagList) {
  var self = this;

  this.id = data.id;
  this.FileName = data.FileName;
  this.Title = data.Title;
  this.Description = data.Description;

  if (data.Keywords == '') data.Keywords = [];
  
  /* an array of {Tag, _destroy} */
  this.tags = ko.observableArray($.map(data.Keywords, function(keyword) {
    return {
      tag: tagList.addTag(keyword), 
    }
  }));
  
  this.keywordList = function() {
      return $.map(self.tags(), function(tag) {
        return tag.tag.keyword();
      });
  };

  /* an array of {keyword, _destroy} */
  // this.Keywords = ko.computed(function() { 
    // keywordArray = $.map(self.tags(), function(tag) { 
      // return { 
        // keyword: ko.observable(tag.tag.keyword()), 
        // _destroy: ko.observable(tag._destroy()) };
    // }); 
    // return keywordArray;
  // });
  
  this.copyKeywords = function() {
    keywordArray = $.map(self.tags(), function(tag) { 
      keyword = tag.tag.keyword();
      return { 
        keyword: ko.observable(keyword), 
        _destroy: ko.observable(false) 
      };
    });
    return keywordArray;
  }
  
  this.thumbnailImage = ko.observable(data.ThumbnailImage);
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;
  
  this.enteredKeyword = ko.observable(''); // keyword typed in to be saved
    
      
  this.isLandscape = ko.computed(function() {
    if (self.width > self.height) return true;
    else return false;
  });
  
  /* Estimate the number of lines needed to view all of the content */
  this.descriptionLines = ko.computed(function() {
    return parseInt((self.Description.length / 60) * 3);
  });
  
  // this.backUp = function() {
    // self.backUp = {id: self.id(), FileName: self.FileName(), Title: self.Title(), Description: self.Description(), Keywords: self.Keywords()};
  // };
  
  this.copyToEdit = function() {
    self.editData = {
      Title: self.Title,
      Description: self.Description,
      Keywords: ko.observableArray(self.copyKeywords())
    };
  };
  
  this.cancel = function() {
    self.editData = null;
  };
  
  this.removeKeyword = function(keyword) {
    keyword._destroy(true);
    console.log(ko.toJS(self.editData.Keywords));
  };
  
  this.keywordEntered = function(d,e) {
    /* If enter key pressed */
    if (e.keyCode === 13) {
      self.editData.Keywords.push({
        keyword: ko.observable(this.enteredKeyword()), 
        _destroy: ko.observable(false),
        _add: true
      });
      self.enteredKeyword(null);


    }
    return true;
  };

    
  this.saveChanges = function(tagList) {
    self.Title = self.editData.Title;
    self.Description = self.editData.Description;
    self.editData.Keywords().forEach(function(keyword, index) {
      if (keyword._add) {
        self.tags.push({tag: tagList.addTag(keyword.keyword()), _destroy: ko.observable(false)});
      }
      if (keyword._destroy()) {
        self.tags()[index]._destroy(true);
        tagList.removeTag(keyword.keyword()); 
        console.log(ko.toJS(tagList));
      }      
    });
  }
    
  this.toJSON = function() {
    return ko.toJSON({id: self.id, FileName: self.FileName, Title: self.Title, Description: self.Description, Keywords: self.Keywords});
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
  // this.selected = ko.observable(false);
  
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
      self.tags.sort(function (left, right) { return left.keyword() == right.keyword() ? 0 : (left.keyword().toLowerCase() < right.keyword().toLowerCase() ? -1 : 1) });
      return newTag;
    }
  };
  
  this.removeTag = function(keyword) {
    console.log('keyword is ' +keyword);
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
  this.filterBy = ko.observable(null);  // keyword used for filtering
  this.enteredKeyword = ko.observable(''); // for filtering
  this.dataLoaded = ko.observable(false); // true when all photos loaded
  this.selectedPhoto = ko.observable(); // photo showing in full view
  
  this.tagList = new TagList(); // List of all tags for all photos
	
  var offset = 0;
  var limit = 20;
   
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
  
  /* return a list of plain text keywords */
  this.keywordList = ko.computed(function() {
    return self.tagList.tags();
  });
  
  
  this.setFilter = function(tag) {
    self.filterBy(tag.keyword());
  };
    
  this.selectPhoto = function(whichPhoto) {
    whichPhoto.copyToEdit();
    self.selectedPhoto(whichPhoto);
  }
  
  this.filteredPhotos = ko.computed(function() {
    var filterKeyword = self.filterBy()
    if (self.filterBy() == null) return self.photoList;
    else {
      return ko.utils.arrayFilter(self.photoList(), function(eachPhoto) {
        var keywords = eachPhoto.keywordList();
        return (keywords.indexOf(filterKeyword) >= 0); 
      });
    }
  });

  this.closePhoto = function() {
    self.selectedPhoto(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhoto();
  }
  
  this.savePhoto = function() {
    // self.appStatus('saving');
    self.selectedPhoto().saveChanges(self.tagList);
    
    var data = self.selectedPhoto().toJSON();
    $.ajax({
      type: "PUT",
      url: "/photo_api/slim/photos",
      data: data,
      success: function(returnedData) {
        self.appStatus('');
        console.log(returnedData);
      }
    });
  }
  
  this.saveAndClose = function() {
    self.savePhoto();
    self.closePhoto();
  }
  
  this.cancel = function() {
    self.selectedPhoto().cancel();
    self.selectedPhoto(null);
  }  
  
  // this.filterThumbnails = function() {
    // keyword = self.filterBy();
    // self.photoList().forEach(function(photo) {
      // photo.showThumbnail(photo.Keywords().indexOf(keyword) >= 0);
    // });
  // }
  
  
};

ko.applyBindings(new ViewModel());
