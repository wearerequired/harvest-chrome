(function() {
  var PlatformExtension,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  PlatformExtension = (function() {
    PlatformExtension.prototype.host = window.host;

    PlatformExtension.prototype.version = chrome.runtime.getManifest().version;

    PlatformExtension.prototype.splashUrl = navigator.userAgent.includes('Edg/') ? 'https://www.getharvest.com/harvest-for-edge-installed' : navigator.userAgent.includes('Firefox/') ? 'https://www.getharvest.com/harvest-for-firefox-installed' : 'https://www.getharvest.com/harvest-for-chrome-installed';

    function PlatformExtension() {
      this.installed = bind(this.installed, this);
      this.attach_platform_worker_listener = bind(this.attach_platform_worker_listener, this);
      this.handleHeaders = bind(this.handleHeaders, this);
      this.handleMessage = bind(this.handleMessage, this);
      chrome.runtime.onMessage.addListener(this.handleMessage);
      chrome.runtime.onInstalled.addListener(this.installed);
      this.attach_platform_worker_listener();
      chrome.webRequest.onHeadersReceived.addListener(this.handleHeaders, {
        urls: ['https://github.com/*'],
        types: ['main_frame']
      }, ['blocking', 'responseHeaders']);
    }

    PlatformExtension.prototype.handleMessage = function(message, sender, respond) {
      switch (message != null ? message.type : void 0) {
        case 'harvest:browser:getHost':
          return respond(this.host);
        case 'harvest:browser:timer:started':
          return this.setRunningTimerIcon(true);
        case 'harvest:browser:timer:stopped':
          return this.setRunningTimerIcon(false);
      }
    };

    PlatformExtension.prototype.handleHeaders = function(arg) {
      var header, i, len, responseHeaders;
      responseHeaders = arg.responseHeaders;
      for (i = 0, len = responseHeaders.length; i < len; i++) {
        header = responseHeaders[i];
        this.handleHeader(header);
      }
      return {
        responseHeaders: responseHeaders
      };
    };

    PlatformExtension.prototype.handleHeader = function(header) {
      var ref;
      if (!this.isCSPHeader(header)) {
        return;
      }
      return header.value = ((ref = header.value) != null ? ref : '').replace(/(child|connect|script|style|img|frame)-src/ig, function(match) {
        return match + " " + (this.host.replace("platform", "*"));
      });
    };

    PlatformExtension.prototype.isCSPHeader = function(header) {
      return /^content-security-policy$/i.test(header.name);
    };

    PlatformExtension.prototype.setRunningTimerIcon = function(running) {
      var state;
      state = running ? "on" : "off";
      chrome.browserAction.setIcon({
        path: {
          "19": "images/h-toolbar-" + state + "@19px.png",
          "38": "images/h-toolbar-" + state + "@38px.png"
        }
      });
      return chrome.browserAction.setTitle({
        title: running ? "View the running Harvest timer" : "Start a Harvest timer"
      });
    };

    PlatformExtension.prototype.attach_platform_worker_listener = function() {
      var background, worker_iframe;
      background = this;
      worker_iframe = "<iframe hidden src=\"" + this.host + "/platform/worker\"></iframe>";
      document.body.insertAdjacentHTML('beforeend', worker_iframe);
      return window.addEventListener("message", function(evt) {
        if (!(evt.origin === this.host && evt.data)) {
          return;
        }
        if (evt.data.type === "timer:started") {
          return background.setRunningTimerIcon(true);
        } else if (evt.data.type === "timer:stopped") {
          return background.setRunningTimerIcon(false);
        } else if (evt.data.type === "timer:update") {
          if (evt.data.value) {
            return background.setRunningTimerIcon(true);
          } else {
            return background.setRunningTimerIcon(false);
          }
        }
      });
    };

    PlatformExtension.prototype.installed = function(arg) {
      var previousVersion, reason;
      reason = arg.reason, previousVersion = arg.previousVersion;
      switch (reason) {
        case chrome.runtime.OnInstalledReason.INSTALL:
          return chrome.tabs.create({
            url: this.splashUrl + "?version=" + this.version
          });
        case chrome.runtime.OnInstalledReason.UPDATE:
          return console.log("Upgrade notice: " + previousVersion + " upgraded to " + this.version);
      }
    };

    return PlatformExtension;

  })();

  new PlatformExtension();

}).call(this);
