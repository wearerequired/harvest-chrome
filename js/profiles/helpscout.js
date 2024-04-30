(function() {
  const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98.4 100"><path d="M88.4 0H10A10 10 0 0 0 0 10v80a10 10 0 0 0 10 10h78.4a10 10 0 0 0 10-10V10a10 10 0 0 0-10-10M25.9 77.5a4 4 0 0 1-3.8 4h-3.9V22.3c0-2.2 1.8-3.9 3.9-3.9h3.8zm11.7-15.8a4 4 0 0 1-3.9 4.1v15.8h-3.8V22.3c0-2.2 1.7-3.9 3.8-3.9h3.9zM57 53.9a4 4 0 0 1-3.8 4h-7.8v23.6h-3.9V46c0-2.2 1.8-3.9 3.9-3.9H57zm11.6 23.6c0 2.2-1.8 4-3.8 4h-3.9V38.1c0-2.2 1.8-3.9 3.9-3.9V18.4h3.8zm11.7 0a4 4 0 0 1-3.9 4h-3.8V22.3c0-2.2 1.7-3.9 3.8-3.9h3.9z" fill-rule="evenodd"/></svg>';

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
      const button = document.createElement("li");
      button.className = "harvest-timer harvest-timer--helpscout-legacy-inbox";
      button.setAttribute("data-skip-styling", true);
      const link = document.createElement("button");
	  link.innerHTML = icon;
      button.appendChild(link);
      return button;
    };

    HelpscoutProfile.prototype.createButtonNew = function() {
      const button = document.createElement("button");
      button.className = "harvest-timer harvest-timer--helpscout-new-inbox";
      button.setAttribute("data-skip-styling", true);
      button.innerHTML = icon;
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
