importScripts('./js/config.js')

// Creates a storage object with access and mutate methods
// that uses the Chrome storage API under the hood
function createStorage(key) {
  return {
    add: async (item) => {
      const { [key]: items } = await chrome.storage.local.get([key])
      const newItems = [...new Set([...(items || []), item])]
      await chrome.storage.local.set({ [key]: newItems })
    },
    remove: async (item) => {
      const { [key]: items } = await chrome.storage.local.get([key])
      if (!items) return
      const newItems = items.filter((i) => i !== item)
      await chrome.storage.local.set({ [key]: newItems })
    },
    all: async () => {
      const { [key]: items } = await chrome.storage.local.get([key])
      return items || []
    },
    length: async () => {
      const { [key]: items } = await chrome.storage.local.get([key])
      return items?.length || 0
    },
  }
}

// Holds the set of tabs that have sent a message to the service worker
const tabs = createStorage('tabs')

// Remove tabs from the set when they are closed
chrome.tabs.onRemoved.addListener(tabs.remove)

function getCredentials() {
  return chrome.storage.local.get(['accessToken', 'accountId'])
}

function setCredentials(accessToken, accountId) {
  return chrome.storage.local.set({ accessToken, accountId })
}

self.addEventListener('install', async () => {
  const { accessToken, accountId } = await getCredentials()
  processAuthCredentialsMessage(accessToken, accountId)
})

const messageHandlers = {
  'auth:credentials': async (params) => {
    const { accessToken, accountId } = params
    await processAuthCredentialsMessage(accessToken, accountId)
  },
  'harvest:settings': async () => settings,
}

let requestId = 0

const messageAuthenticatedHandlers = {
  'asana:get-task-hours': async ({
    external_item_id,
    external_group_id,
    external_service_name,
  }) => {
    const reqId = ++requestId
    const { accessToken, accountId } = await getCredentials()

    const headers = {
      'harvest-account-id': accountId,
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    }

    const url = new URL(`${settings.api_host}/v2/platform/asana_reference`)
    url.searchParams.append('external_item_id', external_item_id)
    url.searchParams.append('external_group_id', external_group_id)
    url.searchParams.append('external_service_name', external_service_name)

    const timerName = `asana:get-task-hours:${external_item_id}:${reqId}`
    console.time(timerName)
    const response = await fetch(url, { headers, method: 'GET' })
    console.timeEnd(timerName)

    if (response.ok) {
      const { total_hours } = await response.json()
      return total_hours
    }
  },
}

async function getHandler(type) {
  const handler = messageHandlers[type]
  if (handler) return handler

  const { accessToken, accountId } = await getCredentials()

  if (accessToken && accountId) {
    const handler = messageAuthenticatedHandlers[type]
    if (handler) return handler
  }

  return null
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const { type, value } = message
  if (sender.tab) tabs.add(sender.tab.id)
  if (!type) return respond(null)

  getHandler(type).then((handler) => {
    if (handler) {
      handler(value).then((result) => respond(result))
    } else {
      respond(null)
    }
  })

  return true
})

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const { version } = chrome.runtime.getManifest()
    const splashUrl = 'https://www.getharvest.com/harvest-for-chrome-installed'
    chrome.tabs.create({ url: `${splashUrl}?version=${version}` })
    setUninstallUrl()
  }

  if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    setUninstallUrl()
    chrome.notifications.create({
      iconUrl: 'images/h-app@128px.png',
      message: 'Please reopen the extension to continue to receive updates.',
      priority: 0,
      title: 'Harvest Time Tracker was updated',
      type: 'basic',
    })
  }
})

// Send a message to all tabs that have sent a message to the service worker
async function sendMessageToTabs(message) {
  const allTabs = await tabs.all()
  allTabs?.forEach((tabId) => chrome.tabs.sendMessage(tabId, message))
}

async function processAuthCredentialsMessage(accessToken, accountId) {
  if (!accessToken || !accountId) return

  const { accountId: currentAccountId } = await getCredentials()
  const subscription = await getSubscription()
  const token = await getWebsocketToken(accessToken, accountId)
  const accountIdChanged = currentAccountId !== accountId

  if (token) {
    await setCredentials(accessToken, accountId)
    setUninstallUrl({ account_id: accountId })
    sendSubscriptionToHaws(subscription, token)
  }

  console.log('Notifying tabs of credentials update')
  await sendMessageToTabs({
    type: 'auth:credentialsUpdated',
    value: { accountIdChanged },
  })
}

self.addEventListener('push', function (event) {
  const data = event.data.json()
  const running = data.event_type === 'start_timer'

  const iconState = running ? 'on' : 'off'

  chrome.action.setIcon({
    path: {
      19: `images/h-toolbar-${iconState}@19px.png`,
      38: `images/h-toolbar-${iconState}@38px.png`,
    },
  })

  const title = running
    ? 'View the running Harvest timer'
    : 'Start a Harvest timer'
  chrome.action.setTitle({ title })
})

const sendSubscriptionToHaws = async (subscription, token) => {
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }

  const body = JSON.stringify({ subscription })

  await fetch(`${settings.haws_host}/subscriptions`, {
    body,
    headers,
    method: 'post',
  })
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

  const chromeVersion = parseInt(
    navigator.userAgentData.brands.find(
      (brand) => brand.brand === 'Google Chrome'
    ).version,
    10
  )

  subscription = await self.registration.pushManager.subscribe({
    applicationServerKey: convertedVapidKey,
    userVisibleOnly: chromeVersion < 121,
  })

  return subscription
}

function setUninstallUrl(params = {}) {
  const { version } = chrome.runtime.getManifest()

  const hiddenFields = new URLSearchParams({
    account_id: '',
    browser: 'chrome',
    version,
    ...params,
  })

  const typeformUrl = `https://harvest.typeform.com/to/ECkKrUFP#${hiddenFields}`
  chrome.runtime.setUninstallURL(typeformUrl)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
