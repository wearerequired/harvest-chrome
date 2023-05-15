(function() {
  var TrelloProfile, getJson, injectScript,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  getJson = function(url, cb) {
    var req;
    req = new XMLHttpRequest();
    req.onload = function() {
      return cb(JSON.parse(req.responseText));
    };
    req.open("GET", url, true);
    return req.send();
  };

  injectScript = function(opts) {
    var name, ph, script, value;
    script = document.createElement("script");
    switch (typeof opts) {
      case "object":
        for (name in opts) {
          value = opts[name];
          script.setAttribute(name, value);
        }
        break;
      case "string":
        script.innerHTML = opts;
    }
    ph = document.getElementsByTagName("script")[0];
    return ph.parentNode.insertBefore(script, ph);
  };

  TrelloProfile = (function() {
    function TrelloProfile() {
      this.hydrateTimer = bind(this.hydrateTimer, this);
      this.addTimer = bind(this.addTimer, this);
      this.addTimerIfOnCard = bind(this.addTimerIfOnCard, this);
      this.actionSelector = ".window-sidebar";
      this.platformLoaded = false;
      this.listen();
      this.infect();
    }

    TrelloProfile.prototype.listen = function() {
      document.body.addEventListener("harvest-event:ready", (function(_this) {
        return function() {
          _this.platformLoaded = true;
          return _this.addTimerIfOnCard();
        };
      })(this));
      return chrome.runtime.onMessage.addListener((function(_this) {
        return function(request) {
          if (request.trelloUrlChanged != null) {
            return _this.addTimerIfOnCard();
          }
        };
      })(this));
    };

    TrelloProfile.prototype.infect = function() {
      return injectScript({
        "data-platform-config": JSON.stringify(this.platformConfig())
      });
    };

    TrelloProfile.prototype.platformConfig = function() {
      return {
        applicationName: "Trello"
      };
    };

    TrelloProfile.prototype.addTimerIfOnCard = function() {
      var _, c, cardId, ref;
      ref = window.location.pathname.split("/"), _ = ref[0], c = ref[1], cardId = ref[2];
      if (!(c === "c" && (cardId != null))) {
        return;
      }
      if (document.getElementById('harvest-trello-timer')) {
        return;
      }
      return this.whenReadyForTimer((function(_this) {
        return function() {
          return _this.addTimer(cardId);
        };
      })(this));
    };

    TrelloProfile.prototype.whenReadyForTimer = function(callback) {
      var poll;
      poll = (function(_this) {
        return function() {
          if (!document.querySelector(_this.actionSelector)) {
            return;
          }
          window.clearInterval(_this.interval);
          return callback();
        };
      })(this);
      window.clearInterval(this.interval);
      return this.interval = window.setInterval(poll, 200);
    };

    TrelloProfile.prototype.addTimer = function(cardId) {
      this.buildTimer();
      return this.fetchCardData(cardId, this.hydrateTimer);
    };

    TrelloProfile.prototype.fetchCardData = function(cardId, cb) {
      var url;
      url = "https://trello.com/1/cards/" + cardId + "?fields=name,shortLink&board=true&board_fields=name";
      return getJson(url, function(cardData) {
        var board, card;
        board = cardData.board;
        card = {
          id: cardData.shortLink,
          name: cardData.name
        };
        return cb(board, card);
      });
    };

    TrelloProfile.prototype.buildTimer = function() {
      var actions, container;
      container = document.createElement('div');
      container.className = 'window-module u-clearfix';
      container.innerHTML = "<h3 class=\"mod-no-top-margin\">Harvest</h3>\n<div class=\"u-clearfix\">\n  <a class=\"button-link\" id=\"harvest-trello-timer\">\n    <span class=\"harvest-trello-timer-icon icon-sm icon-clock\"></span><span class=\"js-sidebar-action-text\">Track Time</span>\n  </a>\n</div>";
      this.timer = container.querySelector('a');
      actions = document.querySelector(this.actionSelector);
      return actions.appendChild(container);
    };

    TrelloProfile.prototype.hydrateTimer = function(board, card) {
      this.timer.setAttribute("data-group", JSON.stringify(board));
      this.timer.setAttribute("data-item", JSON.stringify(card));
      this.timer.setAttribute("data-permalink", "https://trello.com/c/" + card.id);
      this.timer.setAttribute("data-skip-styling", true);
      this.timer.classList.remove("disabled");
      this.timer.classList.add("harvest-timer");
      return this.notifyPlatformOfNewTimers();
    };

    TrelloProfile.prototype.notifyPlatformOfNewTimers = function() {
      var evt;
      evt = new CustomEvent("harvest-event:timers:chrome:add");
      return document.querySelector("#harvest-messaging").dispatchEvent(evt);
    };

    return TrelloProfile;

  })();

  new TrelloProfile();

}).call(this);
