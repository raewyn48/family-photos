var Photo = function(data, tagList) {
  var self = this;

  this.id = data.id;
  this.FileName = data.FileName;
  
  this.dataChanged = ko.observable(false);
  this.editData = ko.observable({});
  
  this.loadData = function(data) {
    self.Title = ((data.Title == null) ? '' : data.Title);
    self.Description = ((data.Description == null) ? '' : data.Description);
    
    self.width = data.ImageWidth;
    self.height = data.ImageHeight;

    if (data.Keywords == '') data.Keywords = [];

    /* an array of {Tag, _destroy} */
    this.tags = ko.observableArray($.map(data.Keywords, function(keyword) {
      return {
        tag: tagList.addTag(keyword),
        _destroy: ko.observable(false) 
      }
    }));
  };
  
  this.loadData(data);
  this.ready = ko.observable(false);
    
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
  this.groupSelected = ko.observable(null); // group selected in tag entry
  
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
    var description = self.editData().Description;
    if (description) {
      return Math.floor(parseInt(description().length / 60) * 3);
    }
  });
  
  
  this.copyToEdit = function() {
    self.editData({
      Title: ko.observable(self.Title),
      Description: ko.observable(self.Description),
      Keywords: ko.observableArray(self.copyKeywords())
    });
    
    self.editData().Title.subscribe(function() {
      self.dataChanged(true);
    });
    
    self.editData().Description.subscribe(function() {
      self.dataChanged(true);
    });
   
    self.editData().Keywords.subscribe(function() {
      self.dataChanged(true);
    });

  };
  
  
  this.cancel = function() {
    self.copyToEdit();
    self.dataChanged(false);
  };
  
  this.removeKeyword = function(keyword) {
    keyword._destroy(true);
    self.dataChanged(true);
  };
  
  this.addKeyword = function() {
    var group = self.groupSelected();
    var groupDisplay = '';
    if (group.groupName()) {
      groupDisplay = group.groupName() + ':';
    }
    if (this.enteredKeyword()) {
      self.editData().Keywords.push({
        keyword: ko.observable(groupDisplay + this.enteredKeyword()), 
        _destroy: ko.observable(false),
        _add: true
      });
      self.enteredKeyword(null);
    }
  }
  
  /* add keyword when enter press is detected */
  this.keywordEntered = function(d,e) {
    /* If enter key pressed */
    if (e.keyCode === 13) {
      self.addKeyword();
    }
    return true;
  };

    
  this.saveChanges = function(tagList) {
    self.Title = self.editData().Title();
    self.Description = self.editData().Description();
    self.editData().Keywords().forEach(function(keyword, index) {
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
  
  this.getData = function() {
    self.ready(false);
    $.getJSON("/photo_api/slim/photos/" + self.id, function(data) {
      if (data) {
        self.loadData(data);
        self.ready(true);
      }
    });
  };
  
  this.ready.subscribe(function() {
    if (self.ready()) self.copyToEdit();
  });
  
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
    return (self.constructedKeyword().toLowerCase() == keyword.toLowerCase());
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
    if (!self.groupName()) return 'Keyword';
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
      var split = keyword.split(':');
      if (split.length > 1) {
        keyword = split[1];
      }
      
      /* Use the one with the most caps for the main tag label */
      var capsNew = keyword.match(/[A-Z]/g) || [];
      var capsOld = existing.keyword().match(/[A-Z]/g) || [];
      if (capsNew.length > capsOld.length) {
        existing.keyword(keyword);
      }
      
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
   
  this.photoList = ko.observableArray([]); // all the photos
  this.appStatus = ko.observable('loading-thumbnails');
  this.filterKeyword = ko.observable(null); // plain text keyword from hash
  this.filterBy = ko.observable(null);  // tag object used for filtering
  this.enteredKeyword = ko.observable(null); // text input for filtering
  this.dataLoaded = ko.observable(false); // true when all photos loaded
  this.selectedFileName = ko.observable(null); // filename from hash
  
  this.pageBreak = 36;
  //this.showPage = ko.observable(1);
  
  this.loadPage = ko.observable(null);
  this.showPage = ko.computed(function() { return self.loadPage() });
  
  this.totalPages = ko.observable(0);
  
  this.totalCount = ko.observable(0);
  
  $.getJSON("/photo_api/slim/photos/count", function(data) {
    if (data) {
      if (data.count) {
        self.totalCount(data.count);
      }
      else {
        console.log("Total photos " + data);
      }
    }
  });

  
  this.tagList = new TagList(); // List of all tags for all photos
	
  /* Load all photo data */
  $.getJSON("/photo_api/slim/photos?min=yes", function(data) {
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
  
  this.filterBy.subscribe(function(value) {
    console.log('filterBy changed to ' + value);
  });
  
  this.filteredPhotos = function() {    
    if (self.filterBy() == null) return self.photoList();
    else {
      var filterKeyword = self.filterBy().constructedKeyword();
      var filteredPhotos = ko.utils.arrayFilter(self.photoList(), function(eachPhoto) {
        var keywords = eachPhoto.keywordList();
	      return (keywords.indexOf(filterKeyword) >= 0); 
      });
      return filteredPhotos;
    }
  };
  
  this.photoCount = ko.computed(function() {
    if (self.filteredPhotos()) {
      return self.filteredPhotos().length;
    }
    else {
      return self.totalCount;
    }
  });

  /* return an array of photos for a particular page */
  this.page = function(pageNum) {
    var photoList = self.filteredPhotos();
    return photoList.slice((pageNum -1) * self.pageBreak, pageNum * self.pageBreak );
  };  
  
  /* Find which page a photo with index should be on */
  this.findPage = function(index) {
    return Math.floor(index / self.pageBreak) + 1;
  }

  /* return the photos to display for the current page */
  this.showPhotos = ko.computed(function() {
    console.log("showing page " + self.showPage());
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
     
  this.selectedPhotoIndex = ko.computed(function() {
    if (self.selectedFileName() == null) {
      console.log("Filename hasn't been set yet. Just wait. Return null.");
      return null;
    }
    if (self.selectedFileName()) {
      console.log('computing index');
      console.log(self.selectedFileName());
      if (self.thumbnailsLoaded.peek()) {
        var selectedIndex = self.showPhotos().findIndex(function(element) {
         return (element.FileName == self.selectedFileName());
        });
        console.log("Found index in showPhotos:" + selectedIndex);
        return selectedIndex;
      }
      else {
        var selectedIndex = self.loadingPhotos().findIndex(function(element) {
          return element.FileName == self.selectedFileName();
        });
        console.log("Found index in loadingPhotos:" + selectedIndex);
        return selectedIndex;
      }
      if (selectedIndex < 0) {
        // not on this page
        console.log('Not on this page');
        
      }
    }
    else {
      console.log('No filename. Returning index -1');
      return -1;
    }
  });
    
  this.selectedPhoto = ko.pureComputed(function() {
    // Look for the photo within the whole filter set
    if (self.selectedFileName() == null) {
      console.log("Filename hasn't been set yet. Just wait. Return null.");
      return null;
    }
    if (self.selectedFileName()) {
      console.log("selected file name is " + self.selectedFileName());
      var selectedIndex = self.filteredPhotos().findIndex(function(photo) {
        return photo.FileName == self.selectedFileName();
      });
      
      if (selectedIndex >= 0) {
        console.log("Found photo, has index " + selectedIndex);
        page = self.findPage(selectedIndex);
        console.log("It should be on page " + page);
        self.loadPage(page);
        photo = self.filteredPhotos()[selectedIndex];
        photo.index = selectedIndex;
        return photo;
      }
      else if (self.filterKeyword()) {
        // Find photo and reset filter
        console.log("Can't find photo in this filter. Reset filter.");
        self.filterKeyword('');
      }
      else {
        console.log("There is no filter so this photo musn't exist. Reset filename.");
        self.selectedFileName('');
      }  
    }
    else console.log("No selected file.");


  });
  
  this.selectedPhoto.extend({ rateLimit: 100 });
  
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

  this.previousPhotoHash = function() {
    if (self.selectedPhoto()) {
      var newFilterIndex = self.selectedPhoto().index-1;
      if (newFilterIndex >= 0) {
        var newPageIndex = self.selectedPhotoIndex()-1;
        var newPhotoFile = self.filteredPhotos()[newFilterIndex].FileName;
        var newPage = self.onPage();
        /* If going on to previous page, change the page */
        if (newPageIndex < 0) {
          newPageIndex = self.pageBreak-1;
          newPage--;
        }
        return self.hash() + '/' + newPage + '/' + safeHash(newPhotoFile);
      }
      else return '#';
    }
    else return '#';
  };

  this.nextPhotoHash = function() {
    if (self.selectedPhoto()) {
      var newFilterIndex = self.selectedPhoto().index+1;
      console.log("Index of selected is " + self.selectedPhoto().index, "new index " + newFilterIndex, "Length: " + self.filteredPhotos().length);
      if (newFilterIndex < self.filteredPhotos().length) {
        var newPageIndex = self.selectedPhotoIndex()+1;
        var newPhotoFile = self.filteredPhotos()[newFilterIndex].FileName;
        var newPage = self.onPage();
        /* If going on to next page, change the page */
        if (newPageIndex >= self.pageBreak) {
          newPageIndex=0;
          newPage++;
        }
        return self.hash() + '/' + newPage + '/' + safeHash(newPhotoFile);
      }
      else return '#';
    }
    else {
      return '#';
    }
    
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
  // this.switchPage = ko.computed(function() {
    // if (self.thumbnailsLoaded()) {
      // self.showPage(self.loadPage());
      // $('html, body').scrollTop(0);
    // }
  // });
  
  /* return an array of page numbers for pagination */
  this.pages = ko.computed(function() {
    var plus = 0;
    var showHowMany = 3;
    self.showPage();    // Force a subscription 
    self.filterBy();
    console.log('Making pagination: show page ' + self.showPage());
    console.log('Making pagination: Number photos ' + self.photoCount());
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
  
  this.showPagination = ko.computed(function() {
    return self.thumbnailsLoaded() && (self.totalPages()>1);
  });
   
  this.closePhoto = function() {
    self.selectedFileName('');
  }
  
  this.photoSelected = function() {
    console.log("selected photo? " + (self.selectedFileName() != ''));
    return self.selectedFileName() != '';
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

  this.save = function() {
    self.savePhoto();
  }
  
  this.saveAndClose = function() {
    self.savePhoto();
    self.closePhoto();
  };
  
  this.cancel = function() {
    self.selectedPhoto().cancel();
    /* Don't close */
//    self.selectedPhotoIndex(null);
  };

  // this.changePage = function(page) {
    // if (self.filterBy() != null) {
      // location.hash = safeHash(self.constructedKeyword()) + '/' + page.pageNum;
    // }
    // else {
      // location.hash = '/' + page.pageNum;
    // }
  // };
  
  this.nextPage = function() {
    self.changePage({pageNum: self.showPage() + 1});
  };
    
  this.previousPage = function() {
    self.changePage({pageNum: self.showPage() - 1});
  };
  
  this.onPage = ko.computed(function() {
    if (self.thumbnailsLoaded()) {
      return self.showPage();
    }
    else return self.loadPage();
  });
  
  this.hash = ko.computed(function() {
    console.log('Computing hash for filter ' + ko.toJS(self.filterBy()));
    if (self.filterBy()) {
      return self.filterBy().hash();
    }
    else return '#';
  });
  
  this.pageHash = ko.computed(function() {
    console.log("Making hash, on page: " + self.onPage());
    if (self.onPage() > 1) {
      return self.hash() + '/' + self.onPage();
    }
    else return self.hash();
  });

  this.photoHash = function(fileName) {
    if (fileName) {
      return self.hash() + '/' + self.onPage() + '/' + safeHash(fileName);
    }
    else return self.pageHash();
  };
  
  this.fullHash = function() {
    if (self.selectedFileName()) {
      console.log("Hash is " + self.hash() + '/' + self.onPage() + '/' + safeHash(self.selectedFileName()));
      return self.hash() + '/' + self.onPage() + '/' + safeHash(self.selectedFileName());
    }
    else return self.pageHash();
  };
  
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
  
  // Routing subscriptions
  
  /* What to do when filterKeyword is changed */
  this.filterKeyword.subscribe(function(keyword) {
    console.log('Keyword changed to ' + keyword);
    if (keyword) {
      var tags = self.tagList.tags();
      var tag = tags.find(function(element) {
        return element.constructedKeyword() == keyword;
      });
      
      console.log("Tag is ", ko.toJS(tag));
      
      if (tag) {
        if (self.filterBy() != null) {
          self.filterBy().selected(false);
        }
        self.filterBy(tag);
        tag.selected(true);
        tag.tagGroup.expanded(true);          
      }
    }
    else {
      if (self.filterBy() != null) {
        self.filterBy().selected(false);
      }
      self.filterBy(null);
    }
    self.resetRoutes();
  });
  
  this.filterKeyword.subscribe(function(oldKeyword) {
    /* Want to reset the page to 1 if the filter is changed */
    /* But not if this is the first time it's set */
    if (oldKeyword != null) {
      self.loadPage(1);
    }
  }, null, "beforeChange");


  /* when the loadPage changes - a new page of thumbnails to be loaded */
  this.loadPage.subscribe(function(value) {
    console.log("Page changed to " + value);
    self.appStatus('loading-thumbnails');
    self.loadingPhotos().forEach(function(photo) {
      /* manually subscribe to force load so we only load the thumbnails needed*/
      photo.thumbnail.subscribe(function(value) {
      });
    });
    self.resetRoutes();
    $('html, body').scrollTop(0);

  });
  
//  this.loadPage.extend({ notify: 'always' });

  /* when selectedFileName changes */
  this.selectedFileName.subscribe(function(filename) {
    if (filename && self.selectedPhoto()) {
      self.selectedPhoto().getData();
    }
    console.log('Filename changed to ' + filename);
    self.resetRoutes();
  });
  
  this.resetRoutes = function() {
    var newLocation = self.fullHash();
    console.log("resetting routes? " + self.fullHash());
    if (newLocation != '#') {
      console.log("YES RESETTING ROUTES to " + self.fullHash());
      routes.setLocation(newLocation);
    }
    else {
      console.log("no location, don't reset routes.");
    }
  };
  
  // Client-side routes
  var routes = Sammy(function() {

  
    /* #:keyword/:page/:file */
    this.get(/\#([^\/]*)\/?([^\/]*)\/?([^\/]*)/, function() {
      var keyword = this.params.splat[0];
      var page = parseInt(this.params.splat[1]);
      var file = this.params.splat[2];
      
      if (!page) page = 1;
      
      console.log("Running route ",keyword, page, file);

      if (self.dataLoaded()) {
        console.log("Loading new values");
        self.filterKeyword(keyword);
        self.loadPage(page);
        self.selectedFileName(file);
      }
      else console.log("data not loaded");
             
    });
    
    this.get('', function() {
      if (self.dataLoaded()) {
        self.filterKeyword('');
        self.loadPage(1);
        self.selectedFileName('');
      }
    });

    
  }).run();
    
};

ko.options.deferUpdates = true;
ko.applyBindings(new ViewModel());
