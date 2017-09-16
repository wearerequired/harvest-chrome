(function() {
  var Basecamp2Profile,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Basecamp2Profile = (function() {
    function Basecamp2Profile(host1) {
      this.host = host1;
      this.addTimer = bind(this.addTimer, this);
      this.addTimers = bind(this.addTimers, this);
      this.groupNameSelector = "h1";
      this.itemSelector = ".todo .content";
      this.platformLoaded = false;
      this.interval = 250;
      this.loadHarvestPlatform();
      window.setInterval(this.addTimers, this.interval);
    }

    Basecamp2Profile.prototype.loadHarvestPlatform = function() {
      var configScript, ph, platformConfig, platformScript;
      platformConfig = {
        applicationName: "Basecamp"
      };
      configScript = document.createElement("script");
      configScript.innerHTML = "window._harvestPlatformConfig = " + (JSON.stringify(platformConfig)) + ";";
      platformScript = document.createElement("script");
      platformScript.src = this.host + "/assets/platform.js";
      platformScript.async = true;
      ph = document.getElementsByTagName("script")[0];
      ph.parentNode.insertBefore(configScript, ph);
      ph.parentNode.insertBefore(platformScript, ph);
      return document.body.addEventListener("harvest-event:ready", (function(_this) {
        return function() {
          _this.platformLoaded = true;
          return _this.addTimers();
        };
      })(this));
    };

    Basecamp2Profile.prototype.addTimers = function() {
      var i, item, items, len, results;
      if (!this.platformLoaded) {
        return;
      }
      items = document.querySelectorAll(this.itemSelector);
      results = [];
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        if (!item.querySelector(".harvest-timer")) {
          results.push(this.addTimer(item));
        }
      }
      return results;
    };

    Basecamp2Profile.prototype.addTimer = function(item) {
      var data;
      data = this.getDataForTimer(item);
      if (this.isTodoCompleted(item) || this.notEnoughInfo(data)) {
        return;
      }
      this.buildTimer(item, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp2Profile.prototype.getDataForTimer = function(item) {
      var groupName, itemName, link, linkParts;
      itemName = (item.querySelector("a[title]") || item.querySelector("a")).innerText;
      groupName = document.querySelector(this.groupNameSelector).innerText;
      link = item.querySelector("a").getAttribute("href") || "";
      linkParts = link.match(/^\/(\d+)\/projects\/(\d+)(?:\S+)?\/todos\/(\d+)/);
      return {
        account: {
          id: linkParts[1]
        },
        group: {
          id: linkParts[2],
          name: groupName
        },
        item: {
          id: linkParts[3],
          name: itemName
        }
      };
    };

    Basecamp2Profile.prototype.isTodoCompleted = function(item) {
      if (item.webkitMatchesSelector(".complete")) {
        return true;
      } else if (item.parentNode && item.parentNode !== document) {
        return this.isTodoCompleted(item.parentNode);
      }
    };

    Basecamp2Profile.prototype.notEnoughInfo = function(data) {
      var ref, ref1;
      return !(((data != null ? (ref = data.group) != null ? ref.id : void 0 : void 0) != null) && ((data != null ? (ref1 = data.item) != null ? ref1.id : void 0 : void 0) != null));
    };

    Basecamp2Profile.prototype.buildTimer = function(item, data) {
      var timer;
      timer = document.createElement("div");
      timer.className = "harvest-timer";
      timer.style.marginRight = "4px";
      timer.setAttribute("id", "harvest-basecamp-timer-" + data.item.id);
      timer.setAttribute("data-account", JSON.stringify(data.account));
      timer.setAttribute("data-group", JSON.stringify(data.group));
      timer.setAttribute("data-item", JSON.stringify(data.item));
      timer.setAttribute("data-permalink", "https://basecamp.com/" + data.account.id + "/projects/" + data.group.id + "/todos/" + data.item.id);
      return item.insertBefore(timer, item.children[0]);
    };

    Basecamp2Profile.prototype.notifyPlatformOfNewTimers = function() {
      var evt;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return document.querySelector("#harvest-messaging").dispatchEvent(evt);
    };

    return Basecamp2Profile;

  })();

  chrome.runtime.sendMessage({
    type: "getHost"
  }, function(host) {
    return new Basecamp2Profile(host);
  });

}).call(this);
