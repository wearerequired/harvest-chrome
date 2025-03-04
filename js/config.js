// changes to this file need to be recompiled with Rake
const settings = {
  api_host: 'https://api.harvestapp.com',
  env: 'production',
  haws_host: 'https://harvestapp-websocket.harvestapp.com',
  host: 'https://platform.harvestapp.com',
  vapid_public_key: 'BHebKi7PaTiZ3fqXTRDtDgHtB4ju1ekLl1GjaxRtj2ToYHizcSTo9gxrivMSFIPtmT1ILlnVrwClU3ZBdQ726h4',
}

self.host = settings.host
if (settings.env !== 'production') {
  chrome.action.setBadgeText({ text: settings.env.substring(0, 3) })
}
