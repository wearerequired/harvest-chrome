(function() {
  var PlatformCookie, PlatformExtension, reconnectAttempts, reconnectTimeout,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  PlatformCookie = this.PlatformCookie;

  reconnectTimeout = null;

  reconnectAttempts = 0;

  PlatformExtension = (function() {
    PlatformExtension.prototype.host = window.host;

    PlatformExtension.prototype.version = chrome.runtime.getManifest().version;

    PlatformExtension.prototype.splashUrl = navigator.userAgent.includes('Edg/') ? 'https://www.getharvest.com/harvest-for-edge-installed' : navigator.userAgent.includes('Firefox/') ? 'https://www.getharvest.com/harvest-for-firefox-installed' : 'https://www.getharvest.com/harvest-for-chrome-installed';

    function PlatformExtension() {
      this.installed = bind(this.installed, this);
      this.getTimerStatus = bind(this.getTimerStatus, this);
      this.handleHeaders = bind(this.handleHeaders, this);
      this.handleMessage = bind(this.handleMessage, this);
      this.connect = bind(this.connect, this);
      this.connect();
      document.addEventListener("login:change", this.connect);
      new PlatformCookie();
      chrome.runtime.onMessage.addListener(this.handleMessage);
      chrome.runtime.onInstalled.addListener(this.installed);
      chrome.webRequest.onHeadersReceived.addListener(this.handleHeaders, {
        urls: ['https://github.com/*'],
        types: ['main_frame']
      }, ['blocking', 'responseHeaders']);
    }

    PlatformExtension.prototype.connect = function() {
      var ref, source, url;
      clearTimeout(reconnectTimeout);
      url = new URL('/platform/events', this.host);
      url.searchParams.set('client_version', this.version);
      if (navigator.userAgent.includes('Edg/')) {
        url.searchParams.set('source', 'edge-extension');
      } else if (navigator.userAgent.includes('Firefox/')) {
        url.searchParams.set('source', 'firefox-extension');
      } else {
        url.searchParams.set('source', 'chrome-extension');
      }
      if ((ref = this.eventSource) != null) {
        ref.close();
      }
      source = this.eventSource = new EventSource(url.toString());
      this.eventSource.onopen = (function(_this) {
        return function() {
          return reconnectAttempts = 0;
        };
      })(this);
      this.eventSource.onerror = (function(_this) {
        return function(error) {
          var delay;
          if (source.readyState !== 2) {
            return;
          }
          delay = 5000 * Math.pow(2, reconnectAttempts++);
          delay += Math.random() * 10000 - 5000;
          delay = Math.min(delay, 60 * 60 * 1000);
          return reconnectTimeout = setTimeout(_this.connect, delay);
        };
      })(this);
      return this.eventSource.onmessage = (function(_this) {
        return function(arg) {
          var data, ref1;
          data = arg.data;
          switch ((ref1 = JSON.parse(data)) != null ? ref1.type : void 0) {
            case 'event':
            case 'stale':
              return _this.getTimerStatus();
          }
        };
      })(this);
    };

    PlatformExtension.prototype.handleMessage = function(message, sender, respond) {
      switch (message != null ? message.type : void 0) {
        case 'getHost':
          return respond(this.host);
        case 'timer:started':
          return this.setRunningTimerIcon(true);
        case 'timer:stopped':
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
        return match + " " + (this.host.replace("platform", "*")) + " https://*.getharvest.com http://*.getharvest.localhost";
      });
    };

    PlatformExtension.prototype.isCSPHeader = function(header) {
      return /^content-security-policy$/i.test(header.name);
    };

    PlatformExtension.prototype.getTimerStatus = function() {
      var xhr;
      xhr = new XMLHttpRequest;
      xhr.onload = (function(_this) {
        return function() {
          var ref;
          if (xhr.status === 401) {
            if ((ref = _this.eventSource) != null) {
              ref.close();
            }
            _this.setRunningTimerIcon(false);
          }
          if (xhr.status === 200) {
            return _this.setRunningTimerIcon(((function() {
              try {
                return JSON.parse(xhr.responseText);
              } catch (error1) {}
            })()) != null);
          }
        };
      })(this);
      xhr.open('get', this.host + "/platform/last_running_timer.json");
      xhr.withCredentials = true;
      if (navigator.userAgent.includes('Edg/')) {
        xhr.setRequestHeader("X-HarvestEdgeExt", this.version);
      } else if (navigator.userAgent.includes('Firefox/')) {
        xhr.setRequestHeader("X-HarvestFirefoxExt", this.version);
      } else {
        xhr.setRequestHeader("X-HarvestChromeExt", this.version);
      }
      return xhr.send();
    };

    PlatformExtension.prototype.setRunningTimerIcon = function(running) {
      var state;
      state = running ? "on" : "off";
      chrome.action.setIcon({
        path: {
          "19": "images/h-toolbar-" + state + "@19px.png",
          "38": "images/h-toolbar-" + state + "@38px.png"
        }
      });
      return chrome.action.setTitle({
        title: running ? "View the running Harvest timer" : "Start a Harvest timer"
      });
    };

    PlatformExtension.prototype.installed = function(arg) {
      var previousVersion, reason;
      reason = arg.reason, previousVersion = arg.previousVersion;
      switch (reason) {
        case 'install':
          return chrome.tabs.create({
            url: this.splashUrl + "?version=" + this.version
          });
        case 'update':
          return console.log("Upgrade notice: " + previousVersion + " upgraded to " + this.version);
      }
    };

    return PlatformExtension;

  })();

  new PlatformExtension();

}).call(this);
