;(function () {
  const Selectors = {
    PeekTopbarActions: '.notion-peek-renderer .notion-topbar-comments-button',
    TaskName: '.notion-peek-renderer h1',
    TopbarCommentsButton: '.notion-topbar-comments-button',
    SlidePanel: 'div.whenContentEditable[role="textbox"]',
  }

  const platformConfig = {
    applicationName: 'Notion',
    skipStyling: true,
  }

  let interval

  function configure() {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  function listen() {
    document.body.addEventListener('harvest-event:ready', () => {
      whenPeekReadyForTimer(() => addTimerToPeekTopBar())
      watchForDocumentChanges()
    })
  }

  function addTimerToPeekTopBar() {
    const name = document.querySelector(Selectors.TaskName).innerHTML
    const id = new URLSearchParams(window.location.search).get('p')
    const item = { name, id }
    const button = buildTimerButton(item)
    const existingButton = document.querySelector('.harvest-timer')

    if (existingButton) {
      existingButton.replaceWith(button)
    } else {
      const topbarActions = document.querySelector(
        Selectors.PeekTopbarActions
      ).parentElement
      topbarActions.prepend(button)
    }

    notifyPlatformOfNewTimer(button)
  }

  function watchForDocumentChanges() {
    const observer = new MutationObserver((mutationList, _) => {
      for (const { addedNodes } of mutationList) {
        if (!addedNodes.length) continue
        const [addedNode] = addedNodes
        if (!addedNode.matches) continue

        // when sidebar is opened, a new topbar is added check for that via updates button
        if (addedNode.querySelector(Selectors.TopbarCommentsButton)) {
          whenPeekReadyForTimer(addTimerToPeekTopBar)
        }

        // when sidebar is open, and content is replaced with a new task, check for that via slide panel
        if (addedNode.matches(Selectors.SlidePanel)) {
          whenPeekReadyForTimer(addTimerToPeekTopBar)
        }
      }
    })

    const config = { attributes: false, childList: true, subtree: true }
    observer.observe(document.body, config)
  }

  function whenPeekReadyForTimer(callback) {
    const poll = () => {
      if (!document.querySelector(Selectors.PeekTopbarActions)) return
      if (!document.querySelector(Selectors.TaskName)) return
      window.clearInterval(interval)
      callback()
    }

    window.clearInterval(interval)
    interval = window.setInterval(poll, 200)
  }

  function buildTimerButton(item) {
    const span = document.createElement('span')
    span.classList.add('harvest-button-span')

    const button = document.createElement('div')
    button.role = 'button'
    button.classList.add('harvest-timer')
    button.setAttribute('data-item', JSON.stringify(item))
    button.setAttribute('data-account', window.location.pathname.split('/')[1])
    //Group should be optional but it is for some reason required. For now we're setting it to 0 to have working profile. TODO: Investigate
    button.setAttribute('data-group', JSON.stringify({ id: 0 }))
    button.setAttribute('data-permalink', window.location.href)
    button.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7.25" stroke-width="1.5"/>
    <path class="minute-hand" d="M8 3V8" stroke-width="1.5" stroke-linecap="round"/>
    <path class="hour-hand" d="M8 5V8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    `
    button.appendChild(span)
    return button
  }

  function notifyPlatformOfNewTimer(element) {
    const detail = { element }
    const evt = new CustomEvent('harvest-event:timers:chrome:add', { detail })
    document.querySelector('#harvest-messaging').dispatchEvent(evt)
  }

  configure()
  listen()
}).call(this)
