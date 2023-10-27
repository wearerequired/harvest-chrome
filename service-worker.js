importScripts('./js/config.js')

chrome.runtime.onMessage.addListener(async (message, sender, respond) => {
  if (message.type === 'auth:credentials') {
    const subscription = await getSubscription()

    const { accessToken, accountId } = message.value
    const token = await getWebsocketToken(accessToken, accountId)

    if (token) {
      sendSubscriptionToHaws(subscription, token)
    }
  }
})

chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
  const { version } = chrome.runtime.getManifest()
  const typeformUrl = `https://harvest.typeform.com/to/ECkKrUFP#version=${version}&browser=chrome`

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const splashUrl = 'https://www.getharvest.com/harvest-for-chrome-installed'
    chrome.tabs.create({ url: `${splashUrl}?version=${version}` })
    chrome.runtime.setUninstallURL(typeformUrl)
  }

  if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.runtime.setUninstallURL(typeformUrl)
    chrome.notifications.create({
      iconUrl: 'images/h-app@128px.png',
      message: 'Please reopen the extension to continue to receive updates.',
      priority: 0,
      title: 'Harvest Time Tracker was updated',
      type: 'basic',
    })
  }
})

chrome.webNavigation.onHistoryStateUpdated.addListener((e) => {
  chrome.tabs.sendMessage(e.tabId, { trelloUrlChanged: true });
}, {
  url: [{ hostSuffix: 'trello.com' }]
})

self.addEventListener('push', function(event) {
  const data = event.data.json()
  const running = data.event_type === 'start_timer'

  const iconState = running ? 'on' : 'off'

  chrome.action.setIcon({
    path: {
      '19': `images/h-toolbar-${iconState}@19px.png`,
      '38': `images/h-toolbar-${iconState}@38px.png`,
    },
  })

  const title = running ? 'View the running Harvest timer' : 'Start a Harvest timer'
  chrome.action.setTitle({ title })
})

const sendSubscriptionToHaws = async (subscription, token) => {
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }

  const body = JSON.stringify({ subscription })

  const response = await fetch(`${settings.haws_host}/subscriptions`, {
    body,
    headers,
    method: 'post',
  })

  if (response.ok) {
    const payload = await response.json()
  }
}

const getWebsocketToken = async (accessToken, accountId) => {
  const headers = {
    'harvest-account-id': accountId,
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
  }

  const response = await fetch(`${settings.api_host}/v2/websocket_token`, {
    headers,
    method: 'GET',
  })

  if (response.ok) {
    const payload = await response.json()
    return payload.token
  }
}

const getSubscription = async () => {
  let subscription = await self.registration.pushManager.getSubscription()

  if (subscription) {
    return subscription
  }

  convertedVapidKey = urlBase64ToUint8Array(settings.vapid_public_key)

  subscription = await self.registration.pushManager.subscribe({
    applicationServerKey: convertedVapidKey,
    userVisibleOnly: true,
  })

  return subscription
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
