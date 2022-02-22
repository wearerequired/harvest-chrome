(function() {
  var HelpscoutProfile, injectScript,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  injectScript = function(opts) {
    var name, ph, script, value;
    script = document.createElement("script");
    switch (typeof opts) {
      case "object":
        for (name in opts) {
          value = opts[name];
          script[name] = value;
        }
        break;
      case "string":
        script.innerHTML = opts;
    }
    ph = document.getElementsByTagName("script")[0];
    return ph.parentNode.insertBefore(script, ph);
  };

  HelpscoutProfile = (function() {
    function HelpscoutProfile(host1) {
      this.host = host1;
      this.addTimerIfOnIssue = bind(this.addTimerIfOnIssue, this);
      this.handleMutations = bind(this.handleMutations, this);
      this.listen();
      this.infect();
    }

    HelpscoutProfile.prototype.platformConfig = function() {
      return {
        applicationName: "Helpscout",
        permalink: "https://secure.helpscout.net/conversation/%ITEM_ID%/%GROUP_ID%"
      };
    };

    HelpscoutProfile.prototype.listen = function() {
      document.body.addEventListener("harvest-event:ready", this.addTimerIfOnIssue);
      this.headerButton = this.createButton();
      return new MutationObserver(this.handleMutations).observe(document.body, {
        childList: true,
        subtree: true
      });
    };

    HelpscoutProfile.prototype.handleMutations = function(mutations) {
      var i, len, node, addedNodes, results;
      results = [];
      for (i = 0, len = mutations.length; i < len; i++) {
        addedNodes = mutations[i].addedNodes;
        results.push((function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = addedNodes.length; j < len1; j++) {
            node = addedNodes[j];
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('c-convo-toolbar')) {
              results1.push(this.addTimerIfOnIssue());
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    HelpscoutProfile.prototype.infect = function() {
      injectScript("window._harvestPlatformConfig = " + (JSON.stringify(this.platformConfig())) + ";");
      injectScript({
        src: this.host + "/assets/platform.js",
        async: true
      });
      return document.addEventListener('pjax:end', this.addTimerIfOnIssue);
    };

    HelpscoutProfile.prototype.addTimerIfOnIssue = function() {
      var _, conversation, conversation_id, conversation_number, folder_id;
      ref = window.location.pathname.split("/"), _ = ref[0], conversation = ref[1], conversation_id = ref[2], conversation_number = ref[3];
      if (!(conversation_id && conversation === "conversation")) {
        return;
      }
      return this.addTimer({
        item: {
          id: conversation_id,
          name: "#" + conversation_number + ": " + (this.issueTitle())
        },
        group: {
          id: conversation_number,
        }
      });
    };

    HelpscoutProfile.prototype.issueTitle = function() {
      var ref;
      return (ref = document.querySelector('#subjectLine')) != null ? ref.innerText : void 0;
    };

    HelpscoutProfile.prototype.addTimer = function(data) {
      var actions, el, i, len, name, ref;
      for (name in data) {
        this.headerButton.dataset[name] = JSON.stringify(data[name]);
      }
      ref = document.querySelectorAll('.harvest-timer');
      for (i = 0, len = ref.length; i < len; i++) {
        el = ref[i];
        if (el !== this.headerButton) {
          el.remove();
        }
      }
      actions = document.querySelector("ul.convo-actions");
      if (actions != null) {
        actions.insertBefore(this.headerButton, actions.children[0]);
      }
      return this.notifyPlatformOfNewTimers();
    };

    HelpscoutProfile.prototype.createButton = function() {
      var button, link, icon;
      button = document.createElement("li");
      button.className = "harvest-timer";
      button.setAttribute("data-skip-styling", true);
      link = document.createElement("a");
      icon = document.createElement("i");
      icon.className = "icon-clock-sm";
      link.appendChild(icon);
      button.appendChild(link);
      return button;
    };

    HelpscoutProfile.prototype.notifyPlatformOfNewTimers = function() {
      var evt, ref;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return (ref = document.querySelector("#harvest-messaging")) != null ? ref.dispatchEvent(evt) : void 0;
    };

    return HelpscoutProfile;

  })();

  chrome.runtime.sendMessage({
    type: "harvest:browser:getHost"
  }, function(host) {
    return new HelpscoutProfile(host);
  });

}).call(this);
