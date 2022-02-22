(function() {
  var canBeClosed, getService, shouldClose, waitUntilChromeAutofocuses;

  canBeClosed = true;

  shouldClose = false;

  window.addEventListener("load", (function(_this) {
    return function() {
      var iframe;
      iframe = document.querySelector("iframe");
      waitUntilChromeAutofocuses(iframe);
      return setTimeout(function() {
        iframe.src = (_this.host + "/platform/timer?service=") + getService();
        return iframe.addEventListener("load", function() {
          return iframe.classList.add("is-loaded");
        });
      }, 0);
    };
  })(this));

  window.addEventListener("message", function(evt) {
    var iframe, message;
    if (evt.origin !== this.host) {
      return;
    }
    iframe = document.querySelector("iframe");
    message = evt.data;
    if (message.type === "frame:close") {
      if (canBeClosed) {
        return window.close();
      } else {
        return shouldClose = true;
      }
    } else if (message.type === "frame:resize") {
      return iframe.style.height = message.value + "px";
    } else if (message.type === "timer:started") {
      return chrome.runtime.sendMessage({
        type: "harvest:browser:timer:started"
      });
    } else if (message.type === "timer:stopped") {
      return chrome.runtime.sendMessage({
        type: "harvest:browser:timer:stopped"
      });
    }
  });

  waitUntilChromeAutofocuses = function(element) {
    return element.getBoundingClientRect().width;
  };

  getService = function() {
    if (navigator.userAgent.includes('Edg/')) {
      return "microsoft.com/edge";
    } else if (navigator.userAgent.includes('Firefox/')) {
      return "mozilla.org/firefox";
    } else {
      return "chrome.google.com";
    }
  };

}).call(this);
