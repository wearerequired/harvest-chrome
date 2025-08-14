;(function () {
  chrome.runtime.onMessage.addListener(function (request, _sender, _respond) {
    if (request.type !== 'auth:credentialsUpdated') return

    if (request.value.accountIdChanged) {
      ;['.harvest-item-total-hours', '.harvest-item-total-hours-row'].forEach(
        (selector) => {
          document.querySelectorAll(selector).forEach((el) => el.remove())
        }
      )
      addTotalHoursToList()
      addTotalHoursToBoard()
      addTimerAndTotalHoursToTaskDetail()
    }
  })

  const settings = {}

  const Selectors = {
    CopyLinkButton: '.TaskPaneToolbar-copyLinkButton',
    HarvestTimer: '.harvest-timer',
    Task: '.TaskPane[role=dialog]',
    TaskWrapper: '.TaskPane-focusTrap',
    Toolbar: '.TaskPaneToolbar',
    ProjectName: '.ProjectPageHeader h1',
    SpreadsheetHeader: '.SpreadsheetHeaderLeftStructure',
    SpreadsheetHeaderPreload: '.SpreadsheetHeaderStructure',
    SpreadsheetGridScroller: '.SpreadsheetGridScroller-container',
    SpreadsheetTaskName: '.SpreadsheetRow .SpreadsheetTaskName',
    SpreadsheetButtonArea:
      '.SpreadsheetGridTaskNameAndDetailsCellGroup-detailsButtonClickArea',
    SpreadsheetTaskNameAndButtonArea:
      '.SpreadsheetGridTaskNameAndDetailsCellGroup',
    Board: '.Board',
    BoardCard: '.BoardCardLayout',
  }

  const ViewContext = {
    listView: 'listView',
    boardView: 'boardView',
  }

  const ContentSelectorForViewContext = {
    [ViewContext.listView]: Selectors.SpreadsheetTaskNameAndButtonArea,
    [ViewContext.boardView]: Selectors.BoardCard,
  }

  function onNodeAdded(element) {
    const { classList } = element
    if (classList.contains('TaskPane-focusTrap')) {
      addTimerAndTotalHoursToTaskDetail()
    } else if (
      classList.contains('SpreadsheetHeaderStructure') ||
      classList.contains('SpreadsheetGridScroller-container')
    ) {
      addTotalHoursToList()
    } else if (classList.contains('Board')) {
      addTotalHoursToBoard()
    }
  }

  function createObserverForSelector(selector, onMatchingNode) {
    return new MutationObserver((mutationsList, _) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && node.matches(selector)) {
              onMatchingNode(node)
            }
          }
        }
      }
    })
  }

  function observeElement(selector) {
    createObserverForSelector(selector, onNodeAdded).observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  function observeElementAndContents(containerSelector, context) {
    if (!Object.values(ViewContext).includes(context)) {
      throw new Error(`Invalid context: ${context}`)
    }

    const contentSelector = ContentSelectorForViewContext[context]
    const contentObserver = createObserverForSelector('*', (node) => {
      const itemElements = node.querySelectorAll(contentSelector)

      if (itemElements.length > 0) {
        if (context === ViewContext.boardView) {
          addTotalHoursToCards(itemElements)
        } else if (context === ViewContext.listView) {
          addTotalHoursToSpreadsheetTasks(itemElements)
        }
      }
    })

    const parentObserver = createObserverForSelector(
      containerSelector,
      (node) =>
        contentObserver.observe(node, { childList: true, subtree: true })
    )

    parentObserver.observe(document.body, { childList: true, subtree: true })
  }

  document.body.addEventListener('harvest-event:ready', initializePage, {
    once: true,
  })

  window.addEventListener('message', async function ({ data }) {
    if (!data || !data.type) return

    const { type, value } = data
    switch (type) {
      case 'timer:stopped':
        if (value?.external_reference?.id) {
          const { id: taskId } = value.external_reference
          updateTotalHoursElement(taskId)
        }
    }
  })

  const platformConfig = {
    applicationName: 'Asana Browser',
    permalink: 'https://app.asana.com/0/%GROUP_ID%/%ITEM_ID%',
  }

  function configure() {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  async function initializePage() {
    // Fetch settings from the worker script
    const response = await chrome.runtime.sendMessage({
      type: 'harvest:settings',
    })
    Object.assign(settings, response)

    if (!Object.keys(settings).length) return

    observeElement(Selectors.SpreadsheetHeaderPreload) // watch for header on list view
    observeElementAndContents(Selectors.Board, ViewContext.boardView) // watch for tasks on board view (initial or pagination)
    observeElementAndContents(
      Selectors.SpreadsheetGridScroller,
      ViewContext.listView
    ) // watch for tasks on list view (initial or pagination)
    observeElement(Selectors.TaskWrapper) // watch for task detail view

    // initial render
    addTotalHoursToList()
    addTotalHoursToBoard()
    addTimerAndTotalHoursToTaskDetail()
  }

  function addTimerAndTotalHoursToTaskDetail() {
    const taskPane = document.querySelector(Selectors.Task)

    if (!taskPane) return

    addTimerToTask(taskPane)
    addTotalHoursToTaskPane(taskPane)
  }

  function buildIcon(host) {
    const iconImg = document.createElement('img')
    iconImg.src = `${host}/img/harvest-logo-gray.svg`
    iconImg.width = 12
    iconImg.height = 12
    iconImg.className =
      'MiniIcon ThemeableRectangularButtonPresentation-leftIcon SubtaskMiniIcon logo'

    return iconImg
  }

  function buildLink(classname) {
    const link = document.createElement('a')
    link.role = 'button'
    link.target = '_blank'
    link.className =
      'ThemeableRectangularButtonPresentation--isEnabled ThemeableRectangularButtonPresentation ThemeableRectangularButtonPresentation--small ThemeableCountWithIconButton--withMiniIcon ThemeableCountWithIconButton SubtleCountWithIconButton SubtleSubtaskCountButton'
    link.classList.add(classname)
    return link
  }

  async function logoElementForListView() {
    const iconImg = buildIcon(settings.host)
    const link = buildLink('header-logo')
    link.href = `https://id.getharvest.com/accounts`

    const textNode = document.createElement('span')

    link.appendChild(textNode)
    link.prepend(iconImg)
    return link
  }

  async function totalHoursElement(taskId, context) {
    const iconImg = buildIcon(settings.host)
    const link = buildLink('harvest-item-total-hours')
    link.dataset.harvestPlatformExternalItemId = taskId
    const url = new URL(`${settings.host}/platform/asana/report`)
    url.searchParams.append('external_item_id', taskId)
    url.searchParams.append('external_group_id', 0)
    url.searchParams.append('external_service_name', 'app.asana.com')
    link.href = url

    const textNode = document.createElement('span')
    context === 'taskDetailView'
      ? (textNode.textContent = '0:00')
      : (textNode.textContent = '')

    link.appendChild(textNode)
    !['boardView', 'listView'].includes(context) && link.prepend(iconImg)
    return link
  }

  function addTotalHoursToList() {
    const spreadsheetGridScroller = document.querySelector(
      Selectors.SpreadsheetGridScroller
    )

    if (!spreadsheetGridScroller) return

    addLogoToListHeader()
    addTotalHoursToSpreadsheetTasks()
  }

  function addTotalHoursToBoard() {
    const board = document.querySelector(Selectors.Board)

    if (!board) return

    addTotalHoursToCards()
  }

  async function addLogoToListHeader() {
    const logo = await logoElementForListView()
    const listHeader = document.querySelector(Selectors.SpreadsheetHeader)

    if (!listHeader) return

    // prevent adding a second totalHours element:
    if (!listHeader.querySelector('a[role="button"]')) {
      listHeader.lastChild.appendChild(logo)
    }
  }

  function addTotalHoursToSpreadsheetTasks(specificTasks) {
    const tasks =
      specificTasks ||
      document.querySelectorAll(
        Selectors.SpreadsheetTaskNameAndButtonArea +
          ':not(:has([data-harvest-platform-external-item-id]))'
      )
    if (!tasks.length) return

    tasks.forEach(async (task) => {
      const textarea = task.querySelector('textarea')
      if (!textarea) return

      const taskId = textarea.id.split('_').pop()
      const totalHoursEl = await totalHoursElement(taskId, 'listView')
      const taskInsertionElement = task.querySelector(
        Selectors.SpreadsheetButtonArea
      )

      // prevent adding a second totalHours element:
      if (!taskInsertionElement.querySelector('a[role="button"]')) {
        taskInsertionElement.appendChild(totalHoursEl)
        updateTotalHoursElement(taskId)
      }
    })
  }

  function addTotalHoursToCards(specificTasks) {
    const cards =
      specificTasks ||
      document.querySelectorAll(
        Selectors.BoardCard +
          ':not(:has([data-harvest-platform-external-item-id]))'
      )

    if (!cards.length) return

    cards.forEach(async (card) => {
      const taskId = card.dataset.taskId
      const totalHoursEl = await totalHoursElement(taskId, 'boardView')
      const cardInsertionElement = card.querySelector(
        '.BoardCardLayout-customPropertiesAndTags'
      )
      const existingTotalHours =
        cardInsertionElement.querySelector('a[role="button"]')

      // prevent adding a second totalHours element:
      if (!existingTotalHours) {
        cardInsertionElement.appendChild(totalHoursEl)
      }

      updateTotalHoursElement(taskId, 'boardView')
    })
  }

  const paneHoursElement = `
    <div class="LabeledRowStructure Stack Stack--align-stretch Stack--direction-row Stack--display-block Stack--justify-start harvest-item-total-hours-row">
      <div class="LabeledRowStructure-left" style="width: 120px;">
        <div class="LabeledRowStructure-labelContainer Stack Stack--align-center Stack--direction-row Stack--display-block Stack--justify-end">
          <label class="LabeledRowStructure-label">
            <span class="TypographyPresentation TypographyPresentation--colorDefault TypographyPresentation--s">Time tracking</span>
          </label>
        </div>
      </div>
      <div class="LabeledRowStructure-right Stack Stack--align-stretch Stack--direction-row Stack--display-block Stack--justify-start">
        <div class="LabeledRowStructure-content Stack Stack--align-center Stack--direction-row Stack--display-block Stack--justify-start">
        </div>
      </div>
    </div>
  `.trim()

  async function addTotalHoursToTaskPane(taskPane) {
    const taskId = taskPane.dataset.taskId
    const totalHoursEl = await totalHoursElement(taskId, 'taskDetailView')
    const taskPaneFields = taskPane.querySelector('.TaskPaneFields')

    if (!taskPaneFields.querySelector('a[role="button"]')) {
      const row = document.createElement('div')
      row.innerHTML = paneHoursElement
      row.firstElementChild
        .querySelector('.LabeledRowStructure-content')
        .appendChild(totalHoursEl)
      taskPaneFields.insertBefore(
        row.firstElementChild,
        taskPaneFields.lastElementChild
      )
    }

    updateTotalHoursElement(taskId)
  }

  async function updateTotalHoursElement(taskId, context) {
    const textNodes = document.querySelectorAll(
      `[data-harvest-platform-external-item-id="${taskId}"] span`
    )

    if (!textNodes.length) return

    const totalHours = await getExternalReferenceTotalHours(taskId)

    if (totalHours && totalHours !== '0:00' && totalHours !== '0.00') {
      const iconImg = buildIcon(settings.host)

      for (const textNode of textNodes) {
        textNode.textContent = totalHours
        if (
          !textNode.parentNode.querySelector('img') &&
          context === 'boardView'
        ) {
          textNode.parentNode.prepend(iconImg)
        }
      }
    }
  }

  async function getExternalReferenceTotalHours(taskId) {
    return await chrome.runtime.sendMessage({
      type: 'asana:get-task-hours',
      value: {
        external_item_id: taskId,
        external_group_id: 0,
        external_service_name: 'app.asana.com',
      },
    })
  }

  function addTimerToTask(taskPane) {
    const toolbar = taskPane.querySelector(Selectors.Toolbar)

    const nativeButton = toolbar.querySelector(Selectors.HarvestTimer)

    if (nativeButton) {
      nativeButton.hidden = true
      nativeButton.classList.remove('harvest-timer')
    }

    const copyLinkButton = toolbar.querySelector(Selectors.CopyLinkButton)
    const timerButton = buildTimerButtonForTask(taskPane)

    copyLinkButton.parentNode.insertBefore(
      timerButton,
      copyLinkButton.nextSibling
    )

    notifyPlatformOfNewTimer(timerButton)
  }

  function getProjectName() {
    return document
      .querySelector(Selectors.ProjectName)
      ?.textContent.replace(/\u00A0/g, ' ')
  }

  function buildTimerButtonForTask(taskPane) {
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
    const projectName = getProjectName()
    if (projectName) {
      button.setAttribute(
        'data-default',
        JSON.stringify({ project_name: projectName })
      )
    }
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
      'ThemeableIconButtonPresentation--medium'
    )

    return button
  }

  function parseTaskMetadata(taskPane) {
    const id = taskPane.dataset.taskId
    const name = taskPane.getAttribute('aria-label')

    return { id, name }
  }

  function notifyPlatformOfNewTimer(element) {
    const detail = { element }
    const evt = new CustomEvent('harvest-event:timers:add', { detail })

    document.querySelector('#harvest-messaging').dispatchEvent(evt)
  }

  configure()
}).call(this)