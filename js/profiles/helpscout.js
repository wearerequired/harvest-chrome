(function() {
  var HelpscoutProfile, injectScript,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  injectScript = function(opts) {
    var name, ph, script, value;
    script = document.createElement("script");
    for (name in opts) {
      value = opts[name];
      script.setAttribute(name, value);
    }
    ph = document.getElementsByTagName("script")[0];
    return ph.parentNode.insertBefore(script, ph);
  };

  HelpscoutProfile = (function() {
    function HelpscoutProfile() {
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
      this.headerButtonOld = this.createButtonOld();
      this.headerButtonNew = this.createButtonNew();
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
            if (node.nodeType === Node.ELEMENT_NODE && node.querySelector('.c-convo-toolbar, [class*="Actionscss__ActionsUI"]')) {
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
      injectScript({
        "data-platform-config": JSON.stringify(this.platformConfig())
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
      return (ref = document.querySelector('#subjectLine, [class*="SubjectFieldcss__Header"]')) !== null ? ref.innerText : void 0;
    };

    HelpscoutProfile.prototype.addTimer = function(data) {
      var actions, el, i, len, name, ref;
      ref = document.querySelectorAll('.harvest-timer');
      for (i = 0, len = ref.length; i < len; i++) {
        el = ref[i];
        if (el !== this.headerButtonOld && el !== this.headerButtoNew) {
          el.remove();
        }
      }
      actions = document.querySelector('ul.convo-actions, [class*="Actionscss__ActionsUI"]');
      if (null !== actions) {
        isOldAction = actions.classList.contains('convo-actions');
        for (name in data) {
          if (isOldAction) {
            this.headerButtonOld.dataset[name] = JSON.stringify(data[name]);
          } else {
            this.headerButtonNew.dataset[name] = JSON.stringify(data[name]);
          }
        }
        actions.insertBefore(isOldAction ? this.headerButtonOld : this.headerButtonNew, actions.children[0]);
      }
      return this.notifyPlatformOfNewTimers();
    };

    HelpscoutProfile.prototype.createButtonOld = function() {
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

    HelpscoutProfile.prototype.createButtonNew = function() {
      var button, icon;
      button = document.createElement("a");
      button.className = "harvest-timer harvest-timer--helpscout-new-inbox";
      button.setAttribute("data-skip-styling", true);
      icon = document.createElement("i");
      icon.className = "icon-clock-sm";
      button.appendChild(icon);
      return button;
    };

    HelpscoutProfile.prototype.notifyPlatformOfNewTimers = function () {
      var evt, ref;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return (ref = document.querySelector("#harvest-messaging")) != null ? ref.dispatchEvent(evt) : void 0;
    };

    return HelpscoutProfile;

  })();

  new HelpscoutProfile();

}).call(this);
