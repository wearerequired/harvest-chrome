(function() {
  var Basecamp3Profile,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Basecamp3Profile = (function() {
    function Basecamp3Profile(host1) {
      this.host = host1;
      this.addFullPageToDoTimer = bind(this.addFullPageToDoTimer, this);
      this.addToDoItemTimer = bind(this.addToDoItemTimer, this);
      this.addToDoListTimer = bind(this.addToDoListTimer, this);
      this.addTimers = bind(this.addTimers, this);
      this.addTimersSoon = bind(this.addTimersSoon, this);
      this.removeTimers = bind(this.removeTimers, this);
      this.platformLoaded = bind(this.platformLoaded, this);
      this.groupNameSelector = ".project-header h1";
      this.platformXDMElement = null;
      this.loadHarvestPlatform();
    }

    Basecamp3Profile.prototype.loadHarvestPlatform = function() {
      var configScript, ph, platformConfig, platformScript;
      platformConfig = {
        applicationName: "Basecamp",
        permalink: "https://3.basecamp.com/%ACCOUNT_ID%/buckets/%GROUP_ID%/%ITEM_ID%"
      };
      configScript = document.createElement("script");
      configScript.innerHTML = "window._harvestPlatformConfig = " + (JSON.stringify(platformConfig)) + ";";
      platformScript = document.createElement("script");
      platformScript.src = this.host + "/assets/platform.js";
      platformScript.async = true;
      ph = document.getElementsByTagName("script")[0];
      ph.parentNode.insertBefore(configScript, ph);
      ph.parentNode.insertBefore(platformScript, ph);
      return document.body.addEventListener("harvest-event:ready", this.platformLoaded);
    };

    Basecamp3Profile.prototype.platformLoaded = function() {
      this.platformXDMElement = document.querySelector("#harvest-messaging");
      document.addEventListener("turbolinks:before-cache", this.removeTimers);
      new MutationObserver(this.addTimersSoon).observe(document.querySelector("html"), {
        childList: true,
        subtree: true
      });
      return this.addTimers();
    };

    Basecamp3Profile.prototype.removeTimers = function() {
      var i, len, ref, results, timer;
      ref = document.querySelectorAll(".harvest-timer");
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        timer = ref[i];
        results.push(timer.remove());
      }
      return results;
    };

    Basecamp3Profile.prototype.addTimersSoon = function() {
      clearTimeout(this.timeout);
      return this.timeout = setTimeout(this.addTimers, 0);
    };

    Basecamp3Profile.prototype.addTimers = function() {
      this.addToDoListTimers();
      this.addToDoItemTimers();
      this.addFullPageToDoTimers();
      return this.addMyAssignmentTimers();
    };

    Basecamp3Profile.prototype.addToDoListTimers = function() {
      var i, item, items, len, results;
      items = document.querySelectorAll(".todolist[data-url]");
      results = [];
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        if (!item.querySelector(".todolist__header .harvest-timer")) {
          results.push(this.addToDoListTimer(item));
        }
      }
      return results;
    };

    Basecamp3Profile.prototype.addToDoListTimer = function(item) {
      var data;
      data = this.getDataForTimer(item);
      if (this.notEnoughInfo(data)) {
        return;
      }
      this.buildToDoListTimer(item, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.buildToDoListTimer = function(item, data) {
      var content, timer;
      timer = document.createElement("div");
      timer.className = "harvest-timer";
      this.addTimerAttributes(timer, data);
      content = item.querySelector(".todolist__title");
      return content.insertBefore(timer, content.querySelector(".todolist__permalink"));
    };

    Basecamp3Profile.prototype.addToDoItemTimers = function() {
      var i, item, items, len, results;
      items = document.querySelectorAll(".todolist .todo[data-url]");
      results = [];
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        if (!item.querySelector(".harvest-timer")) {
          results.push(this.addToDoItemTimer(item));
        }
      }
      return results;
    };

    Basecamp3Profile.prototype.addToDoItemTimer = function(item) {
      var data;
      data = this.getDataForTimer(item);
      if (this.isTodoCompleted(item) || this.notEnoughInfo(data)) {
        return;
      }
      this.buildToDoItemTimer(item, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.buildToDoItemTimer = function(item, data) {
      var content, timer;
      timer = document.createElement("div");
      timer.className = "harvest-timer";
      this.addTimerAttributes(timer, data);
      content = item.querySelector(".checkbox__content");
      return content.insertBefore(timer, content.querySelector(":first-child"));
    };

    Basecamp3Profile.prototype.addFullPageToDoTimers = function() {
      var page;
      page = document.querySelector(".panel");
      if (page.querySelector(".recordable--todo") && !page.querySelector(".harvest-timer")) {
        return this.addFullPageToDoTimer(page);
      }
    };

    Basecamp3Profile.prototype.addFullPageToDoTimer = function(page) {
      var data, item;
      item = page.querySelector(".todo[data-url]");
      data = this.getDataForTimer(item);
      if (this.isTodoCompleted(item) || this.notEnoughInfo(data)) {
        return;
      }
      this.buildFullPageToDoTimer(page, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.buildFullPageToDoTimer = function(page, data) {
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

    Basecamp3Profile.prototype.addMyAssignmentTimers = function() {
      var group, groupLink, groupName, i, item, items, j, k, l, len, len1, len2, len3, ref, ref1, results;
      ref = document.querySelectorAll("article div.push--bottom");
      for (i = 0, len = ref.length; i < len; i++) {
        group = ref[i];
        if (!(groupLink = group.querySelector("a"))) {
          continue;
        }
        groupName = groupLink.innerText;
        items = group.querySelectorAll(".todolist.todolist--assignments");
        for (j = 0, len1 = items.length; j < len1; j++) {
          item = items[j];
          if (!item.querySelector("h4 .harvest-timer")) {
            this.addMyAssignmentTimer(item, groupName);
          }
        }
        items = group.querySelectorAll(".todolist .todo");
        for (k = 0, len2 = items.length; k < len2; k++) {
          item = items[k];
          if (!item.querySelector(".harvest-timer")) {
            this.addMyAssignmentTimer(item, groupName);
          }
        }
      }
      ref1 = document.querySelectorAll(".todolist--by-date .metadata");
      results = [];
      for (l = 0, len3 = ref1.length; l < len3; l++) {
        group = ref1[l];
        if (!(groupLink = group.querySelector("a:nth-child(2)"))) {
          continue;
        }
        groupName = groupLink.innerText;
        items = group.nextElementSibling.querySelectorAll(".todo");
        results.push((function() {
          var len4, m, results1;
          results1 = [];
          for (m = 0, len4 = items.length; m < len4; m++) {
            item = items[m];
            if (!item.querySelector(".harvest-timer")) {
              results1.push(this.addMyAssignmentTimer(item, groupName));
            }
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    Basecamp3Profile.prototype.addMyAssignmentTimer = function(item, groupName) {
      var data;
      data = this.getDataForMyAssignmentTimer(item, groupName);
      if (this.notEnoughInfo(data)) {
        return;
      }
      this.buildMyAssignmentTimer(item, data);
      return this.notifyPlatformOfNewTimers();
    };

    Basecamp3Profile.prototype.buildMyAssignmentTimer = function(item, data) {
      var content, timer;
      timer = document.createElement("div");
      timer.className = "harvest-timer";
      this.addTimerAttributes(timer, data);
      content = item.querySelector("h4") || item.querySelector(".checkbox__content");
      return content.insertBefore(timer, content.querySelector(":first-child"));
    };

    Basecamp3Profile.prototype.getDataForTimer = function(item) {
      var groupName, itemName, link, linkParts;
      itemName = (item.querySelector("a") || item.querySelector("h1")).innerText;
      groupName = document.querySelector(this.groupNameSelector).innerText;
      link = item.dataset.url;
      linkParts = link.match(/^\/(\d+)\/buckets\/(\d+)(?:\S+)?\/(todo(?:list)?s\/\d+)/);
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

    Basecamp3Profile.prototype.getDataForMyAssignmentTimer = function(item, groupName) {
      var itemName, link, linkParts, ref;
      itemName = (item.querySelector("a") || item.querySelector("h1")).innerText;
      link = (ref = item.querySelector("a")) != null ? ref.getAttribute("href") : void 0;
      linkParts = link.match(/^\/(\d+)\/buckets\/(\d+)(?:\S+)?\/(todo(?:list)?s\/\d+)/);
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
