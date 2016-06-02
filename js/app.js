var Photo = function(data, tagList) {
  var self = this;

  this.id = data.id;
  this.FileName = data.FileName;
  
  this.Title = ((data.Title == null) ? '' : data.Title);
  this.Description = ((data.Description == null) ? '' : data.Description);
  
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;

  if (data.Keywords == '') data.Keywords = [];
  
  /* an array of {Tag, _destroy} */
  this.tags = ko.observableArray($.map(data.Keywords, function(keyword) {
    return {
      tag: tagList.addTag(keyword),
      _destroy: ko.observable(false) 
    }
  }));
    
  this.keywordList = ko.computed(function() {
    return $.map(self.tags(), function(tag) {
      if (!tag._destroy()) return tag.tag.constructedKeyword();
    });
  });
  
  /* an array of {keyword, _destroy} */
  this.Keywords = function() { 
    keywordArray = $.map(self.tags(), function(tag) { 
      return { 
        keyword: tag.tag.constructedKeyword(), 
        _destroy: tag._destroy()
      }
    }); 
    return keywordArray;
  };
  
  this.copyKeywords = function() {
    keywordArray = $.map(self.tags(), function(tag) { 
      keyword = tag.tag.constructedKeyword();
      destroy = tag._destroy();
      return { 
        keyword: ko.observable(keyword), 
        _destroy: ko.observable(destroy) 
      };
    });
    return keywordArray;
  }
  
  this.photoURL = ko.observable('/photo_api/photos/' + data.FileName);
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;
  
  this.enteredKeyword = ko.observable(''); // keyword typed in to be saved
  
  this.ThumbnailImage = ko.observable();
  this.thumbnailLoaded = ko.observable(false);
  
  this.fetchedThumbnail = ko.computed(function() {
    // fetch this from the API if it's not already saved
    if (this.thumbnailLoaded()) {
      return true;
    }
    else {
      $.getJSON("/photo_api/slim/photos/thumbnail/" + self.id, function(data) {
        if (data) {
          self.ThumbnailImage(data.ThumbnailImage);
          self.thumbnailLoaded(true);
          return true;
        }
      });
    }
  }, self, {deferEvaluation: true});

    
  this.orientation = ko.computed(function() {
    if (parseInt(self.width) > parseInt(self.height)) return 'landscape';
    else return 'portrait';
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
      }      
    });
  }
    
  this.toJSON = function() {
    return ko.toJSON({id: self.id, FileName: self.FileName, Title: self.Title, Description: self.Description, Keywords: self.Keywords()});
  };
  
  this.pushToServer = function() {
    var data = self.toJSON();
    $.ajax({
      type: "PUT",
      url: "/photo_api/slim/photos",
      data: data,
      success: function(returnedData) {
        console.log("saved " + self.FileName + " to server");
      }
    });

  }
  
  // this.editables.Keywords.subscribe(function(change) {
    // change.forEach(function(keywordChange) {
      // if (keywordChange.status == 'deleted') {
        // // Need some link between this photo's keywords and the main keyword/tag list
      // }
    // });
    // console.log(change[0].status, change[0].index, change[0].value);
  // }, null, "arrayChange");
  
};

var Tag = function(keyword) {
  var self = this;
  
  this.selected = ko.observable(false);
  
  var split = keyword.split(':');
  if (split.length > 1) {
    this.group = ko.observable(split[0]);
    this.keyword = ko.observable(split[1]);
  }
  else {
    this.group = ko.observable('');
    this.keyword = ko.observable(keyword);
  }
  
  this.count = ko.observable(1);
  
  this.keywordWithCount = ko.computed(function() {
    return self.keyword() + ' (' + self.count() + ')';
  });
  
  this.increment = function() {
    self.count(self.count()+1);
  }
  
  this.decrement = function() {
    self.count(self.count()-1);
    return self.count();
  };
    
  this.constructedKeyword = function() {
    if (self.group()) {
      return self.group() + ':' + self.keyword();
    }
    else {
      return self.keyword();
    }
  };
  
  this.match = function(keyword) {
    return (self.constructedKeyword() == keyword);
  }
  

};

var TagGroup = function(tag) {
  var self = this;
  if (tag.group()) {
    this.groupName = ko.observable(tag.group());
  }
  else {
    this.groupName = ko.observable('');
  }
  this.tags = ko.observableArray([tag]);
  this.expanded = ko.observable(false);
  
  this.addTag = function(tag) {
    self.tags.push(tag);
    self.tags.sort(function (left, right) { return left.keyword() == right.keyword() ? 0 : (left.keyword().toLowerCase() < right.keyword().toLowerCase() ? -1 : 1) });
  };
  
  this.groupDisplay = ko.computed(function() {
    if (!self.groupName()) return 'Tags';
    else return self.groupName();
  });
    
  this.logTags = ko.computed(function() {
    //console.log(ko.toJS(self.tags()));
  });
  
  this.toggleExpand = function() {
    self.expanded(!self.expanded());
  };
  
};


var TagList = function() {
  var self = this;
  this.tags = ko.observableArray([]);
  this.groups = ko.observableArray([]);
  
  this.addTag = function(keyword) {
    if (existing = ko.utils.arrayFirst(self.tags(), function(item) { return item.match(keyword)}) ) {
      existing.increment();
      return existing;
    }
    else {
      newTag = new Tag(keyword);
      self.tags.push(newTag);
      
      if (existingGroup = ko.utils.arrayFirst(self.groups(), function(item) {
        return item.groupName() == newTag.group();
      })) {
        existingGroup.addTag(newTag);
      }
      else {
        // create new tag group
        self.groups.push(new TagGroup(newTag));
        self.groups.sort(function (left, right) { return left.groupName() == right.groupName() ? 0 : (left.groupName().toLowerCase() < right.groupName().toLowerCase() ? -1 : 1) });
      }
      
      
      return newTag;
    }
  };
  
  this.removeTag = function(keyword) {
    if (tag = ko.utils.arrayFirst(self.tags(), function(item) { return item.match(keyword) }) ) {
      if (tag.decrement() == 0) {
        self.tags.remove( tag );
      }
    }
      
  }
};


var ViewModel = function() {
  var self = this;
   
  this.photoList = ko.observableArray([]).extend({ rateLimit: 500 });
  this.appStatus = ko.observable('');
  this.filterBy = ko.observable(null);  // keyword used for filtering
  this.enteredKeyword = ko.observable(''); // text input for filtering
  this.dataLoaded = ko.observable(false); // true when all photos loaded
  this.selectedPhoto = ko.observable(null); // photo showing in full view
  this.pageBreak = 24;
  this.currentPage = ko.observable(1);
  this.totalPages = ko.observable(0);
  
  this.photoCount = ko.observable(0);
  
  $.getJSON("/photo_api/slim/photos/count", function(data) {
    if (data) {
      if (data.count) {
        self.photoCount(data.count);
      }
      else {
        console.log(data);
      }
    }
  });

  
  this.tagList = new TagList(); // List of all tags for all photos
	
  var offset = 0;
  var limit = 5;
   
  var allPages = true;
  var numPages = 1;
  
  /* Recursive function for fetching several pages in chunks */
  (function getMoreData(offset,page) {
    if (allPages || (page <= numPages)) {
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
  
  this.groupList = ko.computed(function() {
    //console.log(ko.toJS(self.tagList.groups()));
    return self.tagList.groups();
  });

  
  
  this.setFilter = function(tag) {
    if (self.filterBy() != null) {
      self.filterBy().selected(false);
    }
    self.filterBy(tag);
    tag.selected(true);
  };
    
  this.selectPhoto = function(whichPhoto) {
    whichPhoto.copyToEdit();
    self.selectedPhoto(whichPhoto);
  }
  
  this.filteredPhotos = function() {    
    if (self.filterBy() == null) return self.photoList();
    else {
      var filterKeyword = self.filterBy().constructedKeyword();
      return ko.utils.arrayFilter(self.photoList(), function(eachPhoto) {
        var keywords = eachPhoto.keywordList();
	      return (keywords.indexOf(filterKeyword) >= 0); 
      });
    }
  };

  this.page = ko.computed(function() {
    var photoList = self.filteredPhotos();
    return photoList.slice((self.currentPage() -1) * self.pageBreak, self.currentPage() * self.pageBreak );
  });
  
  this.pages = ko.computed(function() {
    var plus = 0;
    if ((self.photoCount() - Math.floor(self.photoCount() / self.pageBreak) * self.pageBreak) > 0) plus = 1;
    var pageArray = new Array(Math.floor(self.photoCount() / self.pageBreak) + plus);
    self.totalPages(pageArray.length);
    return $.map(pageArray, function(elem, index) { return {pageNum: index+1} });
    
 
  });
  
  /* Return true if all thumbnails for current page have been loaded */
  this.thumbnailsLoaded = ko.computed(function() {
    // Need to wait until the page is complete first
    var thisPage = self.page();
    if (!thisPage.length) return false;
    var allLoaded = thisPage.every(function(photo) {
      return photo.thumbnailLoaded();
    });
    return allLoaded;
    
  });
  
  
  this.closePhoto = function() {
    self.selectedPhoto(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhoto() != null;
  }
  
  this.savePhoto = function() {
    self.appStatus('saving');
    self.selectedPhoto().saveChanges(self.tagList);
    
    var data = self.selectedPhoto().toJSON();
    //console.log(data);
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
  
  this.nextPage = function() {
    self.currentPage(self.currentPage()+1);
  }
    
  this.previousPage = function() {
    self.currentPage(self.currentPage() - 1);
  }
  
  this.changePage = function(page) {
    self.currentPage(page.pageNum);
  }
    
};

ko.options.deferUpdates = true;
ko.applyBindings(new ViewModel());
