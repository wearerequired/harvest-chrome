const platformPickerStatus = document.querySelector('#platform-picker-status')
const platformPickerContainer = document.querySelector('.platform-picker')
const PLATFORMS = {
	basecamp2: 'Basecamp 2',
	basecamp3: 'Basecamp 3',
	trello: 'Trello',
	github: 'GitHub',
	asana: 'Asana',
	linear: 'Linear',
	notion: 'Notion',
	monday: 'Monday',
	helpscout: 'Help Scout',
	gitlab: 'GitLab',
}

function setPlatformPickerStatus(message, isError = false) {
	if (!platformPickerStatus) return

	platformPickerStatus.textContent = message
	platformPickerStatus.style.color = isError ? '#b00020' : '#0a7a0a'
	platformPickerStatus.style.display = message ? 'block' : 'none'
}

async function getActiveTab() {
	const [tab] = await chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	})

	return tab || null
}

function getHostname(url) {
	try {
		return new URL(url).hostname
	} catch {
		return null
	}
}

function isManifestHandledHost(hostname) {
	if (!hostname) return false

	return (
		hostname === 'basecamp.com' ||
		hostname === '3.basecamp.com' ||
		hostname === 'trello.com' ||
		hostname === 'github.com' ||
		hostname === 'app.asana.com' ||
		hostname === 'linear.app' ||
		hostname === 'secure.helpscout.net' ||
		hostname === 'gitlab.com' ||
		hostname.endsWith('.notion.so') ||
		hostname.endsWith('.monday.com')
	)
}

function renderActivateUi() {
	const options = ['<option value="">Select for current tab</option>']
	for (const [value, label] of Object.entries(PLATFORMS)) {
		options.push(`<option value="${value}">${label}</option>`)
	}

	platformPickerContainer.innerHTML = `
		<div id="platform-picker-status" class="platform-picker__status"></div>
		<label>For non-standard hostings:</label>
		<div class="row">
			<select id="platform-picker-select" class="platform-picker__select">
				${options.join('\n')}
			</select>

			<button id="platform-picker-activate" type="button">
				Activate
			</button>
		</div>
	`
}

function renderClearUi(platform) {
	const label = PLATFORMS[platform] || platform

	platformPickerContainer.innerHTML = `
		<div id="platform-picker-status" class="platform-picker__status"></div>
		<label>For non-standard hostings:</label>
		<div class="row">
			<div class="platform-picker__active-label">
				Active: ${label}
			</div>

			<button id="platform-picker-clear" type="button">
				Clear & reload
			</button>
		</div>
	`
}

async function initPlatformPicker() {
	const tab = await getActiveTab()

	if (!tab?.id || !tab.url) {
		platformPickerContainer.style.display = 'none'
		return
	}

	const hostname = getHostname(tab.url)

	if (isManifestHandledHost(hostname)) {
		platformPickerContainer.style.display = 'none'
		return
	}

	const state = await chrome.runtime.sendMessage({
		type: 'get-manual-platform-for-tab',
		value: { tabId: tab.id },
	})

	if (state?.ok && state.platform) {
		renderClearUi(state.platform)

		const statusEl = document.querySelector('#platform-picker-status')
		if (statusEl) {
			statusEl.textContent = ''
			statusEl.style.display = 'none'
		}

		document
			.querySelector('#platform-picker-clear')
			.addEventListener('click', async () => {
				const response = await chrome.runtime.sendMessage({
					type: 'clear-manual-platform-and-reload-tab',
					value: { tabId: tab.id },
				})

				if (!response?.ok) {
					const liveStatus = document.querySelector('#platform-picker-status')
					if (liveStatus) {
						liveStatus.textContent = `Clear & reload failed:\n${response?.error || 'Unknown error'}`
						liveStatus.style.color = '#b00020'
						liveStatus.style.display = 'block'
					}
					return
				}

				window.close()
			})

		return
	}

	renderActivateUi()

	document
		.querySelector('#platform-picker-activate')
		.addEventListener('click', async () => {
			const liveStatus = document.querySelector('#platform-picker-status')

			const platform = document.querySelector('#platform-picker-select').value

			if (!platform) {
				if (liveStatus) {
					liveStatus.textContent = 'Please select a platform.'
					liveStatus.style.color = '#b00020'
					liveStatus.style.display = 'block'
				}
				return
			}

			try {
				const response = await chrome.runtime.sendMessage({
					type: 'activate-platform-for-tab',
					value: {
						tabId: tab.id,
						platform,
					},
				})

				if (!response?.ok) {
					if (liveStatus) {
						liveStatus.textContent = `Activation failed:\n${response?.error || 'Unknown error'}`
						liveStatus.style.color = '#b00020'
						liveStatus.style.display = 'block'
					}
					return
				}

				window.close()
			} catch (error) {
				if (liveStatus) {
					liveStatus.textContent = `Activation failed:\n${error.message}`
					liveStatus.style.color = '#b00020'
					liveStatus.style.display = 'block'
				}
			}
		})
}

initPlatformPicker().catch((error) => {
	platformPickerContainer.style.display = 'none'
	console.error('Initializing failed:', error)
})