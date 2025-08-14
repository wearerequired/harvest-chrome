;(function () {
  const slidePanelOpenElement = '.item-board-subset-tabs-component'

  const platformConfig = {
    applicationName: 'Monday',
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
      watchToAddButton()
    })
  }

  function watchToAddButton() {
    const observer = new MutationObserver((mutationList, _) => {
      for (const { addedNodes } of mutationList) {
        if (!addedNodes.length) continue
        const [addedNode] = addedNodes
        if (!addedNode.matches) continue

        if (addedNode.querySelector(slidePanelOpenElement)) {
          whenSidePanelReadyForTimer(() => addTimer())
        }
      }
    })

    const config = { attributes: false, childList: true, subtree: true }
    observer.observe(document.body, config)
  }

  const TaskNameSelectors = [
    '.item-page-item-name h2',
    '.pulse_title h2',
    '.pulse-page-name-wrapper .ds-text-component-content-text', // Kanban view
  ]

  const TimerLocationElementSelectors = [
    '.item-page-header-component__actions-bar',
    '.pulse_subscribers_wrapper',
    '.pulse-page-name-wrapper .ds-text-component', // Kanban view header
  ]

  function findElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) return element
    }
    return null
  }

  function addTimer() {
    const taskId = window.location.href.split('pulses/')[1]

    if (!taskId) {
      return
    }

    // Get task name from crm/dev or work management product views
    const viewTaskName = findElement(TaskNameSelectors)
    // Get insertion element from crm/dev or work management product views
    const insertionEl = findElement(TimerLocationElementSelectors)
    const accountName = window.location.host.split('.')[0]
    const [boardId] = window.location.pathname
      .split('/')
      .filter((pathValue) => /^\d+$/.test(pathValue))
    const dataGroup = { id: parseInt(boardId, 10) }
    const task = {
      name: viewTaskName.innerHTML,
      id: taskId,
    }
    const button = buildTimerButton(task, accountName, dataGroup)

    if (insertionEl) {
      insertionEl.insertAdjacentElement('beforebegin', button)
      notifyPlatformOfNewTimer(button)
    }
  }

  function whenSidePanelReadyForTimer(callback) {
    const poll = () => {
      if (!document.querySelector(slidePanelOpenElement)) return
      window.clearInterval(interval)
      callback()
    }

    window.clearInterval(interval)
    interval = window.setInterval(poll, 200)
  }

  function buildTimerButton(task, accountName, dataGroup) {
    const span = document.createElement('span')
    span.classList.add('harvest-button-span')

    const button = document.createElement('div')
    button.role = 'button'
    button.classList.add('harvest-timer')
    button.setAttribute('data-item', JSON.stringify(task))
    button.setAttribute('data-account', accountName)
    button.setAttribute('data-group', JSON.stringify(dataGroup))
    button.setAttribute('data-permalink', window.location.href)
    button.innerHTML = `
      <svg id="harvest-monday-svg" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7.25" stroke="#323338" stroke-width="1.5"/>
      <path class="minute-hand" d="M8 3V8" stroke="#323338" stroke-width="1.5" stroke-linecap="round"/>
      <path class="hour-hand" d="M8 5V8" stroke="#323338" stroke-width="1.5" stroke-linecap="round"/>
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
