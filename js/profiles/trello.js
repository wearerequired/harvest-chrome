;(function () {
  const Selectors = {
    HarvestTrelloTimer: '#harvest-trello-timer',
    CardDetailWindow: '.xjFudI2rOfHcKY',
    CardClass: '.QI4qitS2RefeF0',
  }

  const platformConfig = {
    applicationName: 'Trello',
    permalink: 'https://trello.com/c/%ITEM_ID%',
  }

  let timer

  function configure() {
    const script = document.createElement('script')
    script.setAttribute('data-platform-config', JSON.stringify(platformConfig))

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
  }

  function listen() {
    document.body.addEventListener('harvest-event:ready', () => {
      watchForCardChange()
    })
  }

  function addTimerIfOnCard() {
    const { pathname } = window.location
    const [_, c, cardId] = pathname.split('/')

    if (!(c === 'c' && cardId != null)) return
    if (
      !(
        document.querySelector(Selectors.CardClass) ||
        document.querySelector(Selectors.CardDetailWindow)
      )
    )
      return
    if (document.querySelector(Selectors.HarvestTrelloTimer)) return

    addTimerToCard(cardId)
  }

  function watchForCardChange() {
    const observer = new MutationObserver((mutationsList, _) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === 1 &&
              (node.matches(Selectors.CardClass) ||
                node.matches(Selectors.CardDetailWindow))
            ) {
              addTimerIfOnCard()
            }
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  function addTimerToCard(cardId) {
    buildTimer()
    fetchCardData(cardId, hydrateTimer)
  }

  function fetchCardData(cardId, cb) {
    const url = `https://trello.com/1/cards/${cardId}?fields=name,shortLink&board=true&board_fields=name`
    getJson(url, (cardData) => {
      const board = cardData.board
      const card = {
        id: cardData.shortLink,
        name: cardData.name,
      }
      cb(board, card)
    })
  }

  function buildTimer() {
    const container = document.createElement('div')
    container.className = 'window-module u-clearfix'
    container.innerHTML = `
      <h4 style="color: #44546f; font-size: 12px; line-height: 20px; margin-top: 20px;">Harvest</h4>
      <div class="u-clearfix">
        <a class="button-link" id="harvest-trello-timer">
          <span class="harvest-trello-timer-icon icon-sm icon-clock"></span><span class="js-sidebar-action-text">Track Time</span>
        </a>
      </div>
    `
    timer = container.querySelector('a')

    const links = document.querySelectorAll('a')
    let foundLink
    links.forEach(
      (link) => (foundLink = link.href.includes('power-ups') ? link : null)
    )
    const powerUpsSection = foundLink.closest('section')
    powerUpsSection.prepend(container)
  }

  function hydrateTimer(board, card) {
    timer.setAttribute('data-group', JSON.stringify(board))
    timer.setAttribute('data-item', JSON.stringify(card))
    timer.setAttribute('data-permalink', 'https://trello.com/c/' + card.id)
    timer.setAttribute('data-skip-styling', true)
    timer.classList.remove('disabled')
    timer.classList.add('harvest-timer')
    notifyPlatformOfNewTimers()
  }

  function notifyPlatformOfNewTimers() {
    const evt = new CustomEvent('harvest-event:timers:chrome:add')
    document.querySelector('#harvest-messaging').dispatchEvent(evt)
  }

  function getJson(url, cb) {
    fetch(url)
      .then((response) => response.json())
      .then((json) => cb(json))
  }

  configure()
  listen()
}).call(this)
