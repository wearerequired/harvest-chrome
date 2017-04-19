(function() {
  var GithubProfile, injectScript,
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

  GithubProfile = (function() {
    function GithubProfile(host1) {
      this.host = host1;
      this.addTimerIfOnIssue = bind(this.addTimerIfOnIssue, this);
      this.handleMutations = bind(this.handleMutations, this);
      this.listen();
      this.infect();
    }

    GithubProfile.prototype.platformConfig = function() {
      return {
        applicationName: "GitHub",
        permalink: "https://github.com/%ACCOUNT_ID%/%GROUP_ID%/issues/%ITEM_ID%"
      };
    };

    GithubProfile.prototype.listen = function() {
      document.body.addEventListener("harvest-event:ready", this.addTimerIfOnIssue);
      this.headerButton = this.createButton();
      this.headerButton.classList.add('btn-sm');
      this.commentButton = this.createButton();
      return new MutationObserver(this.handleMutations).observe(document.body, {
        childList: true,
        subtree: true
      });
    };

    GithubProfile.prototype.handleMutations = function(mutations) {
      var i, len, node, removedNodes, results;
      results = [];
      for (i = 0, len = mutations.length; i < len; i++) {
        removedNodes = mutations[i].removedNodes;
        results.push((function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = removedNodes.length; j < len1; j++) {
            node = removedNodes[j];
            if (node.contains(this.headerButton) || node.contains(this.commentButton)) {
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

    GithubProfile.prototype.infect = function() {
      injectScript("window._harvestPlatformConfig = " + (JSON.stringify(this.platformConfig())) + ";");
      injectScript({
        src: this.host + "/assets/platform.js",
        async: true
      });
      return document.addEventListener('pjax:end', this.addTimerIfOnIssue);
    };

    GithubProfile.prototype.addTimerIfOnIssue = function() {
      var _, account, group, issueOrPull, item, ref;
      ref = window.location.pathname.split("/"), _ = ref[0], account = ref[1], group = ref[2], issueOrPull = ref[3], item = ref[4];
      if (!(item && item !== 'new' && (issueOrPull === "issues" || issueOrPull === "pull"))) {
        return;
      }
      return this.addTimer({
        item: {
          id: item,
          name: "#" + item + ": " + (this.issueTitle())
        },
        group: {
          id: group,
          name: group
        },
        account: {
          id: account
        }
      });
    };

    GithubProfile.prototype.issueTitle = function() {
      var ref;
      return (ref = document.querySelector('.js-issue-title')) != null ? ref.innerText : void 0;
    };

    GithubProfile.prototype.addTimer = function(data) {
      var actions, el, formActions, i, len, name, ref;
      for (name in data) {
        this.headerButton.dataset[name] = this.commentButton.dataset[name] = JSON.stringify(data[name]);
      }
      ref = document.querySelectorAll('.harvest-timer');
      for (i = 0, len = ref.length; i < len; i++) {
        el = ref[i];
        if (el !== this.headerButton && el !== this.commentButton) {
          el.remove();
        }
      }
      actions = document.querySelector("div.gh-header-actions");
      if (actions != null) {
        actions.insertBefore(this.headerButton, actions.children[0]);
      }
      formActions = document.querySelector('#partial-new-comment-form-actions');
      if (formActions != null) {
        formActions.appendChild(this.commentButton);
      }
      return this.notifyPlatformOfNewTimers();
    };

    GithubProfile.prototype.createButton = function() {
      var button;
      button = document.createElement("button");
      button.type = "button";
      button.classList.add('harvest-timer', 'btn');
      button.setAttribute("data-skip-styling", "true");
      button.innerHTML = "<svg aria-hidden=\"true\" class=\"octicon octicon-clock\" height=\"16\" role=\"img\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\"><path d=\"M8 8h3v2H7c-0.55 0-1-0.45-1-1V4h2v4z m-1-5.7c3.14 0 5.7 2.56 5.7 5.7S10.14 13.7 7 13.7 1.3 11.14 1.3 8s2.56-5.7 5.7-5.7m0-1.3C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7S10.86 1 7 1z\"></path></svg>\nTrack time";
      return button;
    };

    GithubProfile.prototype.notifyPlatformOfNewTimers = function() {
      var evt, ref;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return (ref = document.querySelector("#harvest-messaging")) != null ? ref.dispatchEvent(evt) : void 0;
    };

    return GithubProfile;

  })();

  chrome.runtime.sendMessage({
    type: "getHost"
  }, function(host) {
    return new GithubProfile(host);
  });

}).call(this);
