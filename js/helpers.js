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