(function () {
  const Selectors = {
    CopyLinkButton: '.TaskPaneToolbar-copyLinkButton',
    HarvestTimer: '.harvest-timer',
    Task: '.TaskPane[role=dialog]',
    TaskWrapper: '.TaskPane-focusTrap',
    Toolbar: '.TaskPaneToolbar',
  }

  const platformConfig = {
    applicationName: 'Asana Browser',
    permalink: 'https://app.asana.com/0/%GROUP_ID%/%ITEM_ID%',
  }

  function configure () {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  function listen () {
    // While Asana injects its own `platform.js` file, this prevents from us
    // handling the harvest-event:ready event twice (as `platform.js` is
    // injected twice). TODO: remove once Asana removes native HAP integration.
    const options = { once: true }

    document.body.addEventListener('harvest-event:ready', function() {
      addTimerIfOnTask()
      watchForTaskChange()
    }, options)
  }

  function addTimerIfOnTask () {
    const taskPane = document.querySelector(Selectors.Task)

    if (!taskPane) return

    addTimerToTask(taskPane)
  }

  function watchForTaskChange () {
    const config = { attributes: false, childList: true, subtree: true }

    const callback = (mutationList, _) => {
      for (const { addedNodes } of mutationList) {
        if (!addedNodes.length) continue

        const [ addedNode ] = addedNodes

        if (!addedNode.matches(Selectors.TaskWrapper)) continue

        addTimerToTask(addedNode.querySelector(Selectors.Task))
      }
    }

    const observer = new MutationObserver(callback)

    observer.observe(document.body, config)
  }

  function addTimerToTask (taskPane) {
    const toolbar = taskPane.querySelector(Selectors.Toolbar)

    const nativeButton = toolbar.querySelector(Selectors.HarvestTimer)

    if (nativeButton) {
      nativeButton.hidden = true
      nativeButton.classList.remove('harvest-timer')
    }

    const copyLinkButton = toolbar.querySelector(Selectors.CopyLinkButton)
    const timerButton = buildTimerButtonForTask(taskPane)

    copyLinkButton.parentNode.insertBefore(timerButton, copyLinkButton.nextSibling)

    notifyPlatformOfNewTimer(timerButton)
  }

  function buildTimerButtonForTask (taskPane) {
    const button = document.createElement('div')

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g>
          <path class="circle" d="M16 32.09C8.28 32.09 2 25.81 2 18.09C2 14.57 3.31 11.34 5.46 8.88L3.29 6.71C2.9 6.32 2.9 5.69 3.29 5.3C3.68 4.91 4.31 4.91 4.7 5.3L6.88 7.48C9.33 5.37 12.52 4.1 16 4.1C19.48 4.1 22.67 5.38 25.12 7.48L27.3 5.3C27.69 4.91 28.32 4.91 28.71 5.3C29.1 5.69 29.1 6.32 28.71 6.71L26.54 8.88C28.7 11.34 30 14.57 30 18.09C30 25.81 23.72 32.09 16 32.09ZM16 6.09C9.38 6.09 4 11.47 4 18.09C4 24.71 9.38 30.09 16 30.09C22.62 30.09 28 24.71 28 18.09C28 11.47 22.61 6.09 16 6.09ZM19 2H13C12.45 2 12 1.55 12 1C12 0.45 12.45 0 13 0H19C19.55 0 20 0.45 20 1C20 1.55 19.55 2 19 2Z" />
          <path class="asana-minute-hand" d="M15 9C15 8.44771 15.4477 8 16 8V8C16.5523 8 17 8.44772 17 9V18C17 18.5523 16.5523 19 16 19V19C15.4477 19 15 18.5523 15 18V9Z" />
          <path class="asana-hour-hand" d="M15 9C15 8.44771 15.4477 8 16 8V8C16.5523 8 17 8.44772 17 9V18C17 18.5523 16.5523 19 16 19V19C15.4477 19 15 18.5523 15 18V9Z" />
        </g>
      </svg>
    `

    const metadata = parseTaskMetadata(taskPane)

    button.setAttribute('data-group', JSON.stringify({ id: 0 }))
    button.setAttribute('data-item', JSON.stringify(metadata))

    button.id = 'harvest-asana-timer'
    button.role = 'button'
    button.setAttribute('data-skip-styling', true)
    button.classList.add(
      'harvest-timer',
      // Asana-native classes to match their UI
      'SubtleIconButton',
      'SubtleIconButton--standardTheme',
      'TaskPaneToolbar-button',
      'ThemeableIconButtonPresentation',
      'ThemeableIconButtonPresentation--isEnabled',
      'ThemeableIconButtonPresentation--medium',
    )

    return button
  }

  function parseTaskMetadata (taskPane) {
    const id = taskPane.dataset.taskId
    const name = taskPane.getAttribute('aria-label')

    return { id, name }
  }

  function notifyPlatformOfNewTimer (element) {
    const detail = { element }
    const evt = new CustomEvent('harvest-event:timers:add', { detail })

    document.querySelector('#harvest-messaging').dispatchEvent(evt)
  }

  configure()
  listen()
}).call(this)
