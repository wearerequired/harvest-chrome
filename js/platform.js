(() => {
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const iframe = document.createElement("iframe");
iframe.id = "harvest-iframe";
const dialog = document.createElement("dialog");
dialog.className = "harvest-dialog";
dialog.appendChild(iframe);
dialog.addEventListener("click", close, {
  capture: true
});
document.addEventListener("keyup", ({
  key
}) => key === "Escape" && close(), {
  capture: true
});
function open(url, timer) {
  iframe.src = url;
  timer.insertAdjacentElement("afterend", dialog);
  if(!dialog.open) {
    requestAnimationFrame(() => dialog.showModal())
  }
}
function close() {
  dialog.close();
  dialog.remove();
}
function adjustHeight(height) {
  iframe.style.height = `${height}px`;
  dialog.style.height = `${height}px`;
}
const stylesheet = `.harvest-timer.styled {
  -webkit-font-smoothing: antialiased;
  background-image: linear-gradient(#fff, #eee);
  border: 1px solid #bbb;
  border-radius: 2px;
  color: #222;
  cursor: pointer;
  display: inline-block;
  font: inherit;
  font-size: 0;
  height: 12px;
  line-height: 1;
  margin: 0;
  padding: 3px;
  position: relative;
  vertical-align: top;
  width: 12px;
}
.harvest-timer.styled:hover {
  background-image: linear-gradient(#f8f8f8, #e8e8e8);
}
.harvest-timer.styled:active {
  background: #eee;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.1);
}
.harvest-timer.styled::after {
  background: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='16'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='currentColor'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%20aria-label='Clock%20icon'%3e%3ccircle%20cx='12'%20cy='12'%20r='10'%20/%3e%3cpolyline%20points='12%206%2012%2012%2016%2014'%20/%3e%3c/svg%3e") 50% 50% no-repeat;
  content: "";
  display: inline-block;
  font: inherit;
  height: 100%;
  left: 0;
  margin: 0;
  padding: 0;
  position: absolute;
  top: 0;
  width: 100%;
}

.harvest-timer.styled.running {
  background-image: linear-gradient(#53b2fc, #1385e5);
  border-color: #075fa9;
  color: #fff;
}
.harvest-timer.styled.running:hover {
  background-image: linear-gradient(#49a4fd, #0e7add);
}
.harvest-timer.styled.running:active {
  background: #1385e5;
  box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.2);
}

.harvest-dialog[open] {
  background: white;
  border: none;
  border-radius: 6px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1);
  left: 50%;
  margin: 0;
  margin-left: -250px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  top: 0;
  transition: height 150ms;
  width: 500px;
  z-index: calc(infinity);
}
@media (min-height: 400px) {
  .harvest-dialog[open] {
    top: 10%;
  }
}
@media (min-height: 550px) {
  .harvest-dialog[open] {
    top: 20%;
  }
}

.harvest-dialog[open]::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

#harvest-iframe {
  border: none;
  width: 100%;
}`;
const scheme = "https";
const baseUrl = `${scheme}://${"platform.harvestapp.com"}`;
let lastRunningTimerData;
let xdm = document.getElementById("harvest-messaging");
if (!document.getElementById("harvest-worker")) {
  const worker = document.createElement("iframe");
  worker.hidden = true;
  worker.id = "harvest-worker";
  worker.src = `${baseUrl}/platform/worker`;
  document.body.appendChild(worker);
}
if (!xdm) {
  xdm = document.createElement("div");
  xdm.id = "harvest-messaging";
  xdm.hidden = true;
  document.body.appendChild(xdm);
}
function param(params) {
  const results = [];
  for (const name in params) {
    const value = params[name];
    if (value != null) {
      results.push(`${name}=${encodeURIComponent(value)}`);
    }
  }
  return results.join("&");
}
function config() {
  if (window._harvestPlatformConfig) {
    return window._harvestPlatformConfig;
  } else {
    return JSON.parse(document.querySelector("script[data-platform-config]").dataset.platformConfig);
  }
}
function getData(el) {
  const data = {};
  const attributes = ["account", "item", "group", "default", "skip-styling"];
  for (let i = 0; i < attributes.length; i++) {
    const key = attributes[i];
    if (el.getAttribute(`data-${key}`)) {
      data[key] = getValue(el, key);
    } else {
      data[key] = null;
    }
  }
  if (data.group == null) {
    data.group = getValue(el, "project");
  }
  data.permalink = el.getAttribute("data-permalink");
  return data;
}
function getValue(el, key) {
  let value;
  try {
    value = JSON.parse(el.getAttribute(`data-${key}`));
  } catch (error) {
  }
  if ((value == null ? void 0 : value.id) != null) {
    value.id = "" + value.id;
  }
  return value;
}
function setTimer(data) {
  var _a, _b, _c, _d;
  lastRunningTimerData = data;
  const lastRunningTimerGroup = (_a = data == null ? void 0 : data.group) == null ? void 0 : _a.id;
  const lastRunningTimerItem = (_b = data == null ? void 0 : data.item) == null ? void 0 : _b.id;
  const harvestTimers = document.querySelectorAll(".harvest-timer");
  const results = [];
  for (let i = 0; i < harvestTimers.length; i++) {
    const timer = harvestTimers[i];
    const timerData = getData(timer);
    const group = (_c = timerData.group) == null ? void 0 : _c.id;
    const item = (_d = timerData.item) == null ? void 0 : _d.id;
    if (lastRunningTimerData == null || group !== lastRunningTimerGroup || item !== lastRunningTimerItem) {
      timer.classList.remove("running");
      const removed = [];
      for (let j = 0; j < timer.children.length; j++) {
        const child = timer.children[j];
        removed.push(child.classList.remove("running"));
      }
      results.push(removed);
    } else {
      timer.classList.add("running");
      const added = [];
      for (let j = 0; j < timer.children.length; j++) {
        const child = timer.children[j];
        added.push(child.classList.add("running"));
      }
      results.push(added);
    }
  }
  return results;
}
function stopTimer() {
  return setTimer(null);
}
function createPermalink(template, data) {
  if (template != null && data != null) {
    if (data.account != null) {
      template = template.replace("%ACCOUNT_ID%", data.account.id);
    }
    if (data.group != null) {
      template = template.replace("%PROJECT_ID%", data.group.id);
    }
    if (data.group != null) {
      template = template.replace("%GROUP_ID%", data.group.id);
    }
    if (data.item != null) {
      template = template.replace("%ITEM_ID%", data.item.id);
    }
  }
  return template;
}
function listenForEvent(name, handler) {
  if (window.jQuery != null) {
    return window.jQuery(xdm).bind(name, handler);
  } else {
    return xdm.addEventListener(name, handler);
  }
}
window.addEventListener("message", function(evt) {
  if (evt.origin !== baseUrl) {
    return;
  }
  if (evt.data == null) {
    return;
  }
  const {
    type,
    value
  } = evt.data;
  switch (type) {
    case "frame:close":
      return close();
    case "frame:resize":
      return adjustHeight(value);
    case "timer:started":
      const {
        id,
        group_id
      } = value.external_reference;
      return setTimer({
        group: {
          id: group_id
        },
        item: {
          id
        }
      });
    case "timer:stopped":
      return stopTimer();
  }
});
let HarvestPlatform = class HarvestPlatform2 {
  constructor({
    stylesheet: stylesheet2
  }) {
    // Find the timer associated with the given element
    // element - HTMLElement representing a timer
    //findTimer needs to be an arrow function to inherit `this` context from the class when calling openIframe
    __publicField(this, "findTimer", (element) => {
      const skipAttr = element.getAttribute("data-skip-styling");
      const skipStyling = config().skipStyling || element.classList.contains("styled") || skipAttr != null && skipAttr !== false && skipAttr !== "false";
      if (!skipStyling) {
        element.classList.add("styled");
      }
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        return this.openIframe(element);
      });
      setTimer(lastRunningTimerData);
      return element.setAttribute("data-listening", true);
    });
    this.addTimers = this.addTimers.bind(this);
    this.findTimers = this.findTimers.bind(this);
    this.stylesheet = stylesheet2;
    const styleNode = document.createElement("style");
    document.head.appendChild(styleNode);
    styleNode.appendChild(document.createTextNode(this.stylesheet));
    listenForEvent("harvest-event:timers:add", this.addTimers);
    listenForEvent("harvest-event:timers:chrome:add", this.findTimers);
    this.findTimers();
    xdm.setAttribute("data-ready", true);
    const event = new CustomEvent("harvest-event:ready", {
      cancelable: true,
      bubbles: true
    });
    (document.body || xdm).dispatchEvent(event);
  }
  addTimers(e) {
    var _a, _b, _c;
    let element = e.element || ((_b = (_a = e.originalEvent) == null ? void 0 : _a.detail) == null ? void 0 : _b.element) || ((_c = e.detail) == null ? void 0 : _c.element);
    if ((element == null ? void 0 : element.jquery) != null) {
      element = element.get(0);
    }
    if (element) {
      return this.findTimer(element);
    }
  }
  findTimers() {
    const elements = document.querySelectorAll(".harvest-timer:not([data-listening])");
    return Array.from(elements, this.findTimer);
  }
  // Open a timer dialog for the given timer and pass the given timer data
  // timer - HTMLElement representing the harvest-timer
  // data - Object containing the timer data
  openIframe(element) {
    var _a, _b, _c, _d, _e, _f, _g;
    const data = getData(element);
    const getParams = {
      app_name: config().applicationName,
      service: data.service || window.location.hostname,
      permalink: data.permalink || createPermalink(config().permalink, data),
      external_account_id: (_a = data.account) == null ? void 0 : _a.id,
      external_group_id: (_b = data.group) == null ? void 0 : _b.id,
      external_group_name: (_c = data.group) == null ? void 0 : _c.name,
      external_item_id: (_d = data.item) == null ? void 0 : _d.id,
      external_item_name: (_e = data.item) == null ? void 0 : _e.name,
      default_project_code: (_f = data.default) == null ? void 0 : _f.project_code,
      default_project_name: (_g = data.default) == null ? void 0 : _g.project_name
    };
    return open(`${baseUrl}/platform/timer?${param(getParams)}`, element);
  }
};
if (window.postMessage == null) {
  console.warn(`Harvest Platform is disabled.
To start and stop timers, cross-domain messaging must be supported
by your browser.`);
} else if (!window.XMLHttpRequest || !("withCredentials" in new XMLHttpRequest())) {
  console.warn(`Harvest Platform is disabled.
To check for running timers, xhr requests with credentials must be
supported by your browser.`);
} else if (self.HarvestPlatform != null) {
  self.HarvestPlatform.findTimers();
} else {
  self.HarvestPlatform = new HarvestPlatform({
    stylesheet
  });
}
//# sourceMappingURL=platform.js.map
})()
