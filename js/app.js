var Photo = function(data, tagList) {
  var self = this;

  this.id = data.id;
  this.FileName = data.FileName;
  
  this.Title = ((data.Title == null) ? '' : data.Title);
  this.Description = ((data.Description == null) ? '' : data.Description);
  
  this.width = data.ImageWidth;
  this.height = data.ImageHeight;
  
  this.dataChanged = ko.observable(false);

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
  
  this.thumbnailLoaded = ko.observable(false);
  
  this.thumbnail = ko.computed(function() {
    // fetch this from the API if it's not already saved
    if (this.thumbnailLoaded()) {
      return self.ThumbnailImage();
    }
    else {
      $.getJSON("/photo_api/slim/photos/thumbnail/" + self.id, function(data) {
        if (data) {
          self.thumbnailLoaded(true);
          self.ThumbnailImage = ko.observable(data.ThumbnailImage);
          return self.ThumbnailImage();
        }
      });
    }
  }, this, {deferEvaluation: true});
  

    
  this.orientation = ko.computed(function() {
    if (parseInt(self.width) > parseInt(self.height)) return 'landscape';
    else return 'portrait';
  });
  
  /* Estimate the number of lines needed to view all of the content */
  this.descriptionLines = ko.computed(function() {
    
    return parseInt((self.Description.length / 60) * 3);
  });
  
  
  this.copyToEdit = function() {
    self.editData = {
      Title: ko.observable(self.Title),
      Description: ko.observable(self.Description),
      Keywords: ko.observableArray(self.copyKeywords())
    };
    
    self.editData.Title.subscribe(function() {
      self.dataChanged(true);
    });
    
    self.editData.Description.subscribe(function() {
      self.dataChanged(true);
    });
   
    self.editData.Keywords.subscribe(function() {
      self.dataChanged(true);
    });

  };
  
  
  this.cancel = function() {
    self.editData = null;
    self.dataChanged(false);
  };
  
  this.removeKeyword = function(keyword) {
    keyword._destroy(true);
    self.dataChanged(true);
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
    self.Title = self.editData.Title();
    self.Description = self.editData.Description();
    self.editData.Keywords().forEach(function(keyword, index) {
      if (keyword._add) {
        self.tags.push({tag: tagList.addTag(keyword.keyword()), _destroy: ko.observable(false)});
      }
      if (keyword._destroy()) {
        self.tags()[index]._destroy(true);
        tagList.removeTag(keyword.keyword());
      }      
    });
    self.dataChanged(false);
  }
    
  this.toJSON = function() {
    return ko.toJSON({id: self.id, FileName: self.FileName, Title: self.Title, Description: self.Description, Keywords: self.Keywords()});
  };
  
  this.pushToServer = function() {
    var data = self.toJSON();
    console.log(data);
    $.ajax({
      type: "PUT",
      url: "/photo_api/slim/photos",
      data: data,
      success: function(returnedData) {
        console.log("saved " + self.FileName + " to server");
      }
    });

  }
  
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
  
  // this.tagGroup is set by TagGroup when tag added to group //
  
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
  
  this.hash = ko.computed(function() {
    return '#' + safeHash(self.constructedKeyword());
  });
  
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
  tag.tagGroup = this;
  
  this.addTag = function(tag) {
    self.tags.push(tag);
    self.tags.sort(function (left, right) { return left.keyword() == right.keyword() ? 0 : (left.keyword().toLowerCase() < right.keyword().toLowerCase() ? -1 : 1) });
    tag.tagGroup = self;
  };
  
  this.groupDisplay = ko.computed(function() {
    if (!self.groupName()) return 'Keywords';
    else return self.groupName();
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
   
  this.photoList = ko.observableArray([]);
  this.appStatus = ko.observable('');
  this.filterBy = ko.observable(null);  // keyword used for filtering
  this.enteredKeyword = ko.observable(''); // text input for filtering
  this.dataLoaded = ko.observable(false); // true when all photos loaded
  this.selectedPhotoIndex = ko.observable(null);
  this.pageBreak = 36;
  this.showPage = ko.observable(1);
  this.loadPage = ko.observable(1);
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
	
  /* Load all photo data */
  $.getJSON("/photo_api/slim/photos", function(data) {
    if (data) {
      var fetchedPhotos = $.map(data, function(photo) { return new Photo(photo, self.tagList) });
      self.photoList.push.apply(self.photoList, fetchedPhotos);
      self.dataLoaded(true);

      console.log('data loaded');
      
      // trigger load of initial state
      routes.refresh();
    }
  });

  
  /* Recursive function for fetching several pages in chunks */
  /*
  var offset = 0;
  var limit = 100;
   
  var allPages = true;
  var numPages = 1;
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
          self.dataLoaded(true);
        }
      });
    }
  })(offset, 1);
  */
  
  /* return a list of plain text keywords */
  this.keywordList = ko.computed(function() {
    return self.tagList.tags();
  });
  
  this.groupList = ko.computed(function() {
    //console.log(ko.toJS(self.tagList.groups()));
    return self.tagList.groups();
  });

  
  /* Set a keyword filter for displaying photos */
  // this.setFilter = function(tag) {
    // location.hash = tag.constructedKeyword();
  // };  
  
  this.filteredPhotos = function() {    
    if (self.filterBy() == null) return self.photoList();
    else {
      var filterKeyword = self.filterBy().constructedKeyword();
      var filteredPhotos = ko.utils.arrayFilter(self.photoList(), function(eachPhoto) {
        var keywords = eachPhoto.keywordList();
	      return (keywords.indexOf(filterKeyword) >= 0); 
      });
      self.photoCount(filteredPhotos.length);
      return filteredPhotos;
    }
  };

  /* return an array of photos for a particular page */
  this.page = function(pageNum) {
    var photoList = self.filteredPhotos();
    return photoList.slice((pageNum -1) * self.pageBreak, pageNum * self.pageBreak );
  };  

  /* return the photos to display for the current page */
  this.showPhotos = ko.computed(function() {
    return self.page(self.showPage());
  });

  /* return a list of photos that need to have thumbnails loaded */
  this.loadingPhotos = ko.computed(function() {
    return self.page(self.loadPage());
  });
  
  /* return true if all thumbnails for loadPage have been loaded */
  this.thumbnailsLoaded = ko.computed(function() {
    var thisPage = self.loadingPhotos();
    if (!thisPage.length) return false;
    var allLoaded = thisPage.every(function(photo) {
      return photo.thumbnailLoaded();
    });
    if (allLoaded) self.appStatus('');
    return allLoaded;
    
  });
  
  /* return which photo showing in full view for editing */
  this.selectedPhoto = ko.computed(function() {
     if (self.selectedPhotoIndex() != null) {
      if (self.thumbnailsLoaded()) {
        return self.showPhotos()[self.selectedPhotoIndex()];
      }
      else {
        return self.loadingPhotos()[self.selectedPhotoIndex()];
      }
    }
  }); 

  /* set photo for full view / editing */
  this.selectPhoto = function(index) {
    if (index >= 0) {
      self.selectedPhotoIndex(index);
      self.selectedPhoto().copyToEdit();
    }
  };
  
  /* select the next photo on the page to view */
  this.next = function() {
    var newIndex = self.selectedPhotoIndex()+1;
    /* If going on to next page, change the page */
    if (newIndex >= self.pageBreak) {
      self.nextPage();
      newIndex=0;
    }
    self.selectPhoto(newIndex);
    
  };
  
  /* select the previous photo on the page to view */
  this.previous = function() {
    var newIndex = self.selectedPhotoIndex()-1;
    /* If going on to previous page, change the page */
    if (newIndex < 0) {
      self.previousPage();
      newIndex=self.pageBreak-1;
    }
    self.selectPhoto(newIndex);
  };
  
  /* Is this the first photo in the set? */
  this.firstPhoto = function() {
    return ((self.selectedPhotoIndex() == 0) && (self.showPage() == 1));
  };
  
  /* Is this the last photo in the set? */
  this.lastPhoto = function() {
    var photosOnPage = self.showPhotos().length;
    return (((self.selectedPhotoIndex()+1) == photosOnPage) && (self.showPage() == self.totalPages()));
  };
  
  /* show the loaded page of thumbnails */
  this.switchPage = ko.computed(function() {
    if (self.thumbnailsLoaded()) {
      self.showPage(self.loadPage());
      $('html, body').scrollTop(0);
    }
  });
  
  /* return an array of page numbers for pagination */
  this.pages = ko.computed(function() {
    var plus = 0;
    var showHowMany = 3;
    self.showPage();    // Force a subscription 
    self.filterBy();
    if ((self.photoCount() - Math.floor(self.photoCount() / self.pageBreak) * self.pageBreak) > 0) plus = 1;
    var pageArray = new Array(Math.floor(self.photoCount() / self.pageBreak) + plus);
    self.totalPages(pageArray.length);
    pages = $.map(pageArray, function(elem, index) { 
      pageNum = index+1;
      return {
        pageNum: pageNum,
        inPageRange: ko.computed(function() {
          if (pageNum == 1) return true;
          if (pageNum == pageArray.length) return true;
          if (self.showPage() < (1+showHowMany/2)) {
            return pageNum <= (showHowMany+1);
          }
          else if ((pageArray.length - self.showPage()) < showHowMany/2) {
            return pageNum >= (pageArray.length - showHowMany);
          }
          else {            
            return (pageNum < (self.showPage() + showHowMany/2)) && (pageNum > (self.showPage() - showHowMany/2));
          }
        }),
      }
    });
    return pages;
  });  
   
  this.closePhoto = function() {
    self.selectedPhotoIndex(null);
  }
  
  this.photoSelected = function() {
    return self.selectedPhotoIndex() != null;
  }
  
  this.savePhoto = function() {
    self.appStatus('saving');
    var selectedPhoto = self.selectedPhoto();
    selectedPhoto.saveChanges(self.tagList);
    var data = selectedPhoto.toJSON();
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
  };
  
  this.saveAndClose = function() {
    self.savePhoto();
    self.closePhoto();
  };
  
  this.cancel = function() {
    self.selectedPhoto().cancel();
    self.selectedPhoto(null);
  };

  this.changePage = function(page) {
    if (self.filterBy() != null) {
      location.hash = safeHash(self.constructedKeyword()) + '/' + page.pageNum;
    }
    else {
      location.hash = '/' + page.pageNum;
    }
  };
  
  this.nextPage = function() {
    self.changePage({pageNum: self.showPage() + 1});
  };
    
  this.previousPage = function() {
    self.changePage({pageNum: self.showPage() - 1});
  };
  
  
  /* when the loadPage changes - a new page of thumbnails to be loaded */
  this.loadPage.subscribe(function(value) {
    if (self.dataLoaded()) {
      console.log('loadPage changed',value);
      self.appStatus('loading-thumbnails');
      self.loadingPhotos().forEach(function(photo) {
        /* manually subscribe to force load so we only load the thumbnails needed*/
        photo.thumbnail.subscribe(function(value) {
        });
      });
    }
  });
  
  this.loadPage.extend({ notify: 'always' });
  
  this.hash = ko.computed(function() {
    if (self.filterBy()) {
      return self.filterBy().hash();
    }
    else return '#';
  });
  
  this.previousHash = ko.computed(function() {
    if (self.showPage() > 1) {
      return self.hash() + '/' + (self.showPage()-1);
    }
    else {
      return '#';
    }
  });
  
  this.nextHash = ko.computed(function() {
    if (self.showPage() < self.totalPages()) {
      return self.hash() + '/' + (self.showPage()+1);
    }
    else {
      return '#';
    }
  });

  this.cancelPrevPage = function() {
    if (self.showPage() <= 1) {
      return false;
    }
    return true;
  };

  this.cancelNextPage = function() {
    if (self.showPage() >= self.totalPages()) {
      return false;
    }
    return true;
  };
  
  // Client-side routes
  var routes = Sammy(function() {

       
    this.get('#:keyword', function() {
      var keyword = this.params.keyword;
      console.log(keyword);
      if (keyword != self.filterBy()) {
        if (self.dataLoaded()) {
          var tags = self.tagList.tags();
          var tag = tags.find(function(element) {
            return element.constructedKeyword() == keyword;
          });
          
          if (tag) {
            if (self.filterBy() != null) {
              self.filterBy().selected(false);
            }
            self.filterBy(tag);
            tag.selected(true);
            tag.tagGroup.expanded(true);          
          }
          self.showPage(1);
        }
      }
    });
    
    this.get('#/:page', function() {
      this.app.runRoute('get','');
      self.loadPage(parseInt(this.params.page));
    });


    this.get('#:keyword/:page', function() {
      this.app.runRoute('get','#' + this.params.keyword);
      self.loadPage(parseInt(this.params.page));
    });
      
    this.get('', function() {
      if (self.dataLoaded()) {
        if (self.filterBy() != null) {
          self.filterBy().selected(false);
        }
        self.filterBy(null);
      }
    });

  }).run();
    
};

ko.options.deferUpdates = true;
ko.applyBindings(new ViewModel());
