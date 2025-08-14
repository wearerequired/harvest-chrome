;(function () {
  const Selectors = {
    Main: 'main',
    Toolbar: 'header',
    IssueView: '[data-view-id="issue-view"]',
  }

  const platformConfig = {
    applicationName: 'Linear',
    permalink: 'https://linear.app/%GROUP_ID%/issue/%ITEM_ID%',
  }

  function configure() {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  function listen() {
    document.body.addEventListener('harvest-event:ready', function () {
      watchForIssueChange()
    })
  }

  function watchForIssueChange() {
    const config = {
      attributes: false,
      childList: true,
      subtree: true,
    }

    const callback = (mutationlist, _) => {
      for (const mutation of mutationlist) {
        if (
          mutation.target.matches &&
          mutation.addedNodes.length &&
          (mutation.target.matches(Selectors.Main) ||
            mutation.target.matches(Selectors.Toolbar) ||
            mutation.target.querySelector(Selectors.IssueView))
        ) {
          document.querySelector('.harvest-timer-container')?.remove()
          addTimerToSidebar(mutation)
        }
      }
    }

    const observer = new MutationObserver(callback)

    observer.observe(document.body, config)
  }

  function addTimerToSidebar(mutation) {
    const baseURI = mutation.target.baseURI
    const [_, groupId, __, issueId, issueSlug] = baseURI
      .split('//')[1]
      .split('/')

    const sideNav = (
      document.querySelector(
        'div[data-contextual-menu]:has([data-detail-button="true"])'
      ) ||
      document
        .querySelector('button[aria-label="Copy issue URL"]')
        ?.closest('div[data-contextual-menu]')
    )?.lastElementChild

    if (!sideNav) {
      console.warn(
        'No linear sidebar/contextual menu section found, not on an issue or class names/structure have changed'
      )
      return
    }

    const buttonContainer = buildTimerForIssue(groupId, issueId, issueSlug)

    if (sideNav.querySelector('.harvest-timer')) {
      sideNav.querySelector('.harvest-timer').remove()
    }
    sideNav.append(buttonContainer)
    notifyPlatformOfNewTimer(buttonContainer.querySelector('button'))
  }

  function buildTimerForIssue(groupId, issueId) {
    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('harvest-timer-container')

    const header = document.createElement('div')
    header.classList.add('harvest-timer-header')
    header.textContent = 'Time tracking'
    buttonContainer.appendChild(header)
    const button = document.createElement('button')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '16')
    svg.setAttribute('height', '16')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('viewBox', '0 0 14 14')
    svg.innerHTML = `
      <path fill-rule="evenodd" clip-rule="evenodd" d="M7 0C10.866 0 14 3.13401 14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7C0 3.13401 3.13401 0 7 0Z" fill="#6B6F76"/>
      <path class="minute-hand" d="M6.25 4.25C6.25 3.83579 6.55786 2.25 7 2.25C7.44214 2.25 7.75 3.83579 7.75 4.25V5.5V7.01331C7.75 7.26331 7.5862 7.74951 6.9862 7.74951C6.57199 7.74951 6.25 7.42752 6.25 7.01331V4.25Z" fill="#F5F5F5"/>
      <path class="hour-hand" d="M6.25 4.9995C6.25 4.58529 6.55786 2.9995 7 2.9995C7.44214 2.9995 7.75 4.58529 7.75 4.9995V6.2495V6.9995C7.75 7.2495 7.6 7.7495 7 7.7495C6.58579 7.7495 6.25 7.41371 6.25 6.9995V4.9995Z" fill="#F5F5F5"/>
    `
    button.appendChild(svg)

    const buttonText = document.createElement('span')
    button.appendChild(buttonText)

    button.classList.add('harvest-timer')
    button.dataset.skipStyling = true
    button.dataset.group = JSON.stringify({ id: groupId })
    button.dataset.item = JSON.stringify({ id: issueId, name: issueId })
    buttonContainer.appendChild(button)

    return buttonContainer
  }

  function notifyPlatformOfNewTimer(element) {
    const detail = { element }
    const evt = new CustomEvent('harvest-event:timers:add', { detail })

    document.querySelector('#harvest-messaging').dispatchEvent(evt)
  }

  configure()
  listen()
}).call(this)
