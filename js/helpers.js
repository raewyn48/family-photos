function safeHash(string) {
  var safe = ' !@$^&*()_-={}[]|\:;"' + "'<,>.~`";
  var safeStr = '';
  for (i=0; i<string.length;i++) {
    if ((i==0 || i==(string.length-1)) && string[i]==' ') {
      safeStr += encodeURIComponent(string[i]);
    }
    else {
      if (safe.indexOf(string[i]) < 0) {
        safeStr += encodeURIComponent(string[i]);
      }
      else {
        safeStr += string[i];
      }
    }
  }
  return safeStr;
}

var isDebug = false;

if(isDebug && window.console && console.log && console.warn && console.error){
    window.debug = {
        'log': window.console.log.bind(console),
        'warn': window.console.warn.bind(console),
        'error': window.console.error.bind(console)
    };
}else{
    window.debug = {
        'log': function(){},
        'warn': function(){},
        'error': function(){}
    };
}