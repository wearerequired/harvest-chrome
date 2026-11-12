;(function () {
  // Basecamp 5 runs on https://app.basecamp.com (classic "Basecamp 3" is on
  // 3.basecamp.com — see basecamp3.js). The DOM was redesigned for Turbo/Hotwire,
  // so the selectors differ from basecamp3.js, but the underlying record URLs are
  // unchanged (/{account}/buckets/{bucket}/todos|todolists/{id}) and internal IDs
  // are still bc3 GIDs, so the data model mirrors the Basecamp 3 profile.
  const PERMALINK_HOST = 'https://app.basecamp.com'

  // Matches /{account}/buckets/{bucket}/(todos|todolists)/{id} from a record's
  // data-url, capturing account id, bucket (group) id, and the "todos/{id}" or
  // "todolists/{id}" item path.
  const RECORD_URL = /^\/(\d+)\/buckets\/(\d+)(?:\S+)?\/(todo(?:list)?s\/\d+)/

  const platformConfig = {
    applicationName: 'Basecamp',
  }

  let messagingElement = null
  let addTimersTimeout = null

  // Basecamp 5 accounts can be opened on the legacy 3.basecamp.com host, where
  // the extension also loads basecamp3.js. Both profiles are injected there, so
  // each must decide whether it is the right one for the page. Basecamp 5 is
  // rendered by Turbo/Hotwire and always ships the `turbo-root` meta tag plus
  // turbo-frames, which classic Basecamp 3 never emits.
  function isBasecamp5() {
    return !!(
      document.querySelector('meta[name="turbo-root"]') ||
      document.querySelector('turbo-frame')
    )
  }

  function configure() {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  function listen() {
    document.body.addEventListener('harvest-event:ready', function () {
      messagingElement = document.querySelector('#harvest-messaging')
      // Turbo caches page snapshots; strip our timers before caching so they
      // are rebuilt fresh on restore rather than duplicated.
      document.addEventListener('turbo:before-cache', removeTimers)

      new MutationObserver(addTimersSoon).observe(document.documentElement, {
        childList: true,
        subtree: true,
      })

      addTimers()
    })
  }

  function removeTimers() {
    document.querySelectorAll('.harvest-timer').forEach(function (timer) {
      timer.remove()
    })
  }

  function addTimersSoon() {
    clearTimeout(addTimersTimeout)
    addTimersTimeout = setTimeout(addTimers, 0)
  }

  function addTimers() {
    addToDoListTimers()
    addToDoItemTimers()
    addFullPageToDoTimer()
  }

  // The project (bucket) name, shown in the perma-toolbar breadcrumb on both the
  // list and the single to-do pages.
  function groupName() {
    const breadcrumb = document.querySelector(
      '.perma-toolbar__breadcrumb--bucket'
    )
    if (!breadcrumb) {
      return ''
    }
    // Prefer the title attribute (exact project name) over textContent, which
    // can include a leading project icon/avatar's text on the live DOM.
    return (
      breadcrumb.getAttribute('title') ||
      breadcrumb.textContent ||
      ''
    ).trim()
  }

  function dataFromUrl(url, itemName) {
    if (!url) {
      return null
    }
    const parts = url.match(RECORD_URL)
    if (!parts) {
      return null
    }
    return {
      account: { id: parts[1] },
      group: { id: parts[2], name: groupName() },
      item: { id: parts[3], name: itemName },
    }
  }

  function notEnoughInfo(data) {
    return !(data && data.group.id && data.item.id)
  }

  function isCompleted(item) {
    if (item.matches('.completed')) {
      return true
    }
    if (item.closest('ul.todos.completed')) {
      return true
    }
    const checkbox = item.querySelector('input[name="todo_complete"]')
    return !!(checkbox && checkbox.checked)
  }

  // A timer next to each to-do list header, tracking against the list itself.
  function addToDoListTimers() {
    document
      .querySelectorAll('article.todolist[data-url]')
      .forEach(function (list) {
        const title = list.querySelector('.todolist__title')
        if (!title || title.querySelector('.harvest-timer')) {
          return
        }

        const permalink = title.querySelector('.todolist__permalink, a')
        const name = permalink ? permalink.textContent.trim() : ''
        const data = dataFromUrl(list.dataset.url, name)
        if (notEnoughInfo(data)) {
          return
        }

        const timer = buildInlineTimer(data)
        // Prepend within the title; firstChild is always a valid reference
        // (or null -> append), avoiding a nested-node insertBefore error.
        title.insertBefore(timer, title.firstChild)
        notifyPlatformOfNewTimers()
      })
  }

  // A timer next to each individual to-do in a list.
  function addToDoItemTimers() {
    document.querySelectorAll('li.todo[data-url]').forEach(function (item) {
      const content = item.querySelector('.todo__content')
      if (!content || content.querySelector('.harvest-timer')) {
        return
      }

      const link = content.querySelector('a')
      const name = link ? link.textContent.trim() : ''
      const data = dataFromUrl(item.dataset.url, name)
      if (isCompleted(item) || notEnoughInfo(data)) {
        return
      }

      const timer = buildInlineTimer(data)
      content.insertBefore(timer, content.firstChild)
      notifyPlatformOfNewTimers()
    })
  }

  // A larger button in the toolbar of a single to-do's full-page view.
  function addFullPageToDoTimer() {
    const page = document.querySelector('article.recordable--todo')
    if (!page) {
      return
    }

    const toolbar = document.querySelector('.perma-toolbar__actions')
    if (!toolbar || toolbar.querySelector('.harvest-timer')) {
      return
    }

    const item = page.querySelector('li.todo[data-url]')
    if (!item) {
      return
    }

    const title = page.querySelector('.perma-header__title')
    const name = title ? title.textContent.trim() : ''
    const data = dataFromUrl(item.dataset.url, name)
    if (isCompleted(item) || notEnoughInfo(data)) {
      return
    }

    const timer = buildButtonTimer(data)
    // .action-sheet can be nested (not a direct child of the toolbar); only a
    // direct child is a valid insertBefore reference, and null safely appends.
    const actionSheet = toolbar.querySelector(':scope > .action-sheet')
    toolbar.insertBefore(timer, actionSheet)
    notifyPlatformOfNewTimers()
  }

  function buildInlineTimer(data) {
    const timer = document.createElement('div')
    timer.className = 'harvest-timer'
    addTimerAttributes(timer, data)
    return timer
  }

  function buildButtonTimer(data) {
    const timer = document.createElement('button')
    timer.type = 'button'
    timer.className = 'harvest-timer btn btn--sm'
    timer.dataset.skipStyling = true
    addTimerAttributes(timer, data)

    const icon = document.createElement('span')
    icon.className = 'harvest-timer-icon'

    const stopped = document.createElement('span')
    stopped.className = 'stopped-text'
    stopped.innerText = 'Track time'

    const running = document.createElement('span')
    running.className = 'running-text'
    running.innerText = 'Stop timer'

    timer.appendChild(icon)
    timer.appendChild(stopped)
    timer.appendChild(running)
    return timer
  }

  function addTimerAttributes(timer, data) {
    const todoId = data.item.id.split('/').pop()
    timer.setAttribute('id', 'harvest-basecamp-timer-' + todoId)
    timer.dataset.account = JSON.stringify(data.account)
    timer.dataset.group = JSON.stringify(data.group)
    timer.dataset.item = JSON.stringify(data.item)
    timer.dataset.permalink =
      PERMALINK_HOST +
      '/' +
      data.account.id +
      '/buckets/' +
      data.group.id +
      '/' +
      data.item.id
  }

  function notifyPlatformOfNewTimers() {
    const currentMessagingElement = document.querySelector('#harvest-messaging')
    if (currentMessagingElement) {
      currentMessagingElement.dispatchEvent(
        new CustomEvent('harvest-event:timers:chrome:add')
      )
    }
    if (messagingElement && messagingElement !== currentMessagingElement) {
      messagingElement.dispatchEvent(
        new CustomEvent('harvest-event:timers:chrome:add')
      )
    }
  }

  if (isBasecamp5()) {
    // Marks the page so that basecamp5.css only ever styles Basecamp 5 timers,
    // even on 3.basecamp.com where basecamp3.css is loaded alongside it.
    document.body.classList.add('harvest-basecamp5')
    configure()
    listen()
  }
}).call(this)
