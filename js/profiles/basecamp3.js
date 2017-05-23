(function() {
  var Basecamp3Profile,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Basecamp3Profile = (function() {
    function Basecamp3Profile(host1) {
      this.host = host1;
      this.addPageTimer = bind(this.addPageTimer, this);
      this.addTimer = bind(this.addTimer, this);
      this.addTimers = bind(this.addTimers, this);
      this.addTimersSoon = bind(this.addTimersSoon, this);
      this.groupNameSelector = ".project-header h1";
      this.itemSelector = ".todolist .todo[data-url]";
      this.pageSelector = ".panel";
      this.platformXDMElement = null;
      this.loadHarvestPlatform();
    }

    Basecamp3Profile.prototype.loadHarvestPlatform = function() {
      var configScript, ph, platformConfig, platformScript;
      platformConfig = {
        applicationName: "Basecamp",
        permalink: "https://3.basecamp.com/%ACCOUNT_ID%/buckets/%GROUP_ID%/todos/%ITEM_ID%"
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
          _this.platformXDMElement = document.querySelector("#harvest-messaging");
          new MutationObserver(_this.addTimersSoon).observe(document.body, {
            childList: true,
            subtree: true
          });
          document.addEventListener("turbolinks:render", _this.addTimersSoon);
          return _this.addTimers();
        };
      })(this));
    };

    Basecamp3Profile.prototype.addTimersSoon = function() {
      clearTimeout(this.timeout);
      return this.timeout = setTimeout(this.addTimers, 0);
    };

    Basecamp3Profile.prototype.addTimers = function() {
      var i, item, items, len, page;
      items = document.querySelectorAll(this.itemSelector);
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        if (!item.querySelector(".harvest-timer")) {
          this.addTimer(item);
        }
      }
      page = document.querySelector(this.pageSelector);
      if (page.querySelector(".recordable--todo") && !page.querySelector(".harvest-timer")) {
        return this.addPageTimer(page);
      }
    };

    Basecamp3Profile.prototype.addTimer = function(item) {
      var data;
      data = this.getDataForTimer(item);
      if (this.isTodoCompleted(item) || this.notEnoughInfo(data)) {
        return;
      }
      this.buildTimer(item, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.addPageTimer = function(page) {
      var data, item;
      item = page.querySelector(".todo[data-url]");
      data = this.getDataForTimer(item);
      if (this.isTodoCompleted(item) || this.notEnoughInfo(data)) {
        return;
      }
      this.buildPageTimer(page, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.getDataForTimer = function(item) {
      var groupName, itemName, link, linkParts;
      itemName = (item.querySelector("a") || item.querySelector("h1")).innerText;
      groupName = document.querySelector(this.groupNameSelector).innerText;
      link = item.dataset.url;
      linkParts = link.match(/^\/(\d+)\/buckets\/(\d+)(?:\S+)?\/todos\/(\d+)/);
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

    Basecamp3Profile.prototype.isTodoCompleted = function(item) {
      return item.classList.contains("completed");
    };

    Basecamp3Profile.prototype.notEnoughInfo = function(data) {
      var ref, ref1;
      return !(((data != null ? (ref = data.group) != null ? ref.id : void 0 : void 0) != null) && ((data != null ? (ref1 = data.item) != null ? ref1.id : void 0 : void 0) != null));
    };

    Basecamp3Profile.prototype.buildTimer = function(item, data) {
      var content, timer;
      timer = document.createElement("div");
      timer.className = "harvest-timer";
      this.addTimerAttributes(timer, data);
      content = item.querySelector(".checkbox__content");
      return content.insertBefore(timer, content.querySelector(":first-child"));
    };

    Basecamp3Profile.prototype.buildPageTimer = function(page, data) {
      var icon, running, stopped, timer, toolbar;
      timer = document.createElement("button");
      timer.type = "button";
      timer.className = "harvest-timer action_button small";
      timer.setAttribute("data-skip-styling", true);
      this.addTimerAttributes(timer, data);
      icon = document.createElement("span");
      icon.className = "harvest-timer-icon";
      stopped = document.createElement("span");
      stopped.className = "stopped-text";
      stopped.innerText = "Track time";
      running = document.createElement("span");
      running.className = "running-text";
      running.innerText = "Stop timer";
      timer.appendChild(icon);
      timer.appendChild(stopped);
      timer.appendChild(running);
      toolbar = page.querySelector(".perma-toolbar");
      return toolbar.insertBefore(timer, toolbar.querySelector(".perma-toolbar__more-edit-button-actions").nextSibling);
    };

    Basecamp3Profile.prototype.addTimerAttributes = function(timer, data) {
      timer.setAttribute("id", "harvest-basecamp-timer-" + data.item.id);
      timer.setAttribute("data-account", JSON.stringify(data.account));
      timer.setAttribute("data-group", JSON.stringify(data.group));
      return timer.setAttribute("data-item", JSON.stringify(data.item));
    };

    Basecamp3Profile.prototype.notifyPlatformOfNewTimers = function() {
      var evt;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return this.platformXDMElement.dispatchEvent(evt);
    };

    return Basecamp3Profile;

  })();

  chrome.runtime.sendMessage({
    type: "getHostIfEnabled",
    featureFlag: "basecamp3_integration_enabled"
  }, function(host) {
    if (host) {
      return new Basecamp3Profile(host);
    }
  });

}).call(this);
