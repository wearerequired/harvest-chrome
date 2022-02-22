
/*
  To change which server is used, edit local storage for the extension
  and set the "host" key.

  Check README for instructions on how to change this in every different browser
 */

(function() {
  var defaultHost, savedHost;

  defaultHost = "https://platform.harvestapp.com";

  savedHost = localStorage.getItem("host");

  this.host = (savedHost || defaultHost).replace(/\/$/, "");

  localStorage.setItem("host", this.host);

  chrome.browserAction.setBadgeText({
    text: this.host === defaultHost ? "" : this.host.match(/\.localhost/i) ? "local" : "stage"
  });

}).call(this);
