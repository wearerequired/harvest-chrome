; (function () {
	const Selectors = {
		placement: '[data-testid="work-item-type"] + .gl-flex',
		taskName: '[data-testid="work-item-title"]',
	}

	const platformConfig = {
		applicationName: 'GitLab',
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
			whenReadyForTimer();
			watchForDocumentChanges()
		})
	}

	function addTimer(placementElement, taskNameElement) {
		const name = taskNameElement.innerHTML
		const id = window.location.pathname.split('/').pop().split('-').pop()
		const item = { name, id }
		const button = buildTimerButton(item)
		const existingButton = document.querySelector('.notion-topbar .harvest-timer')

		if (existingButton) {
			existingButton.replaceWith(button)
		} else {
			placementElement.prepend(button)
		}

		notifyPlatformOfNewTimer(button)
	}

	function watchForDocumentChanges() {
		const observer = new MutationObserver((mutationList, _) => {
			for (const { addedNodes } of mutationList) {
				if (!addedNodes.length) continue
				const [addedNode] = addedNodes
				if (!addedNode.matches) continue

				if (addedNode.matches('.work-item-detail')) {
					whenReadyForTimer();
				}
			}
		})

		const config = { attributes: false, childList: true, subtree: true }
		observer.observe(document.body, config)
	}

	function whenReadyForTimer() {
		const poll = () => {
			const placementElement = document.querySelector(Selectors.placement);
			if (!document.querySelector(Selectors.placement)) return

			const taskNameElement = document.querySelector(Selectors.taskName);
			if (!taskNameElement) return;

			window.clearInterval(interval)
			addTimer(placementElement, taskNameElement)
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
		// Remove all HTML tags from the name attribute before stringifying.
		item.name = item.name.replace(/<[^>]*>/g, '')
		button.setAttribute('data-item', JSON.stringify(item))
		// Clone the item to avoid modifying the original object
		const itemCopy = { ...item }
		itemCopy.name = itemCopy.name.replace(/<[^>]*>/g, '')
		button.setAttribute('data-item', JSON.stringify(itemCopy))
		button.setAttribute('data-account', window.location.pathname.split('/')[1])
		//Group should be optional but it is for some reason required. For now we're setting it to 0 to have working profile. TODO: Investigate
		button.setAttribute('data-group', JSON.stringify({ id: 0 }))
		button.setAttribute('data-permalink', window.location.href)
		button.innerHTML = `
		<svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
			<g>
				<path class="circle" d="M16 32.09C8.28 32.09 2 25.81 2 18.09C2 14.57 3.31 11.34 5.46 8.88L3.29 6.71C2.9 6.32 2.9 5.69 3.29 5.3C3.68 4.91 4.31 4.91 4.7 5.3L6.88 7.48C9.33 5.37 12.52 4.1 16 4.1C19.48 4.1 22.67 5.38 25.12 7.48L27.3 5.3C27.69 4.91 28.32 4.91 28.71 5.3C29.1 5.69 29.1 6.32 28.71 6.71L26.54 8.88C28.7 11.34 30 14.57 30 18.09C30 25.81 23.72 32.09 16 32.09ZM16 6.09C9.38 6.09 4 11.47 4 18.09C4 24.71 9.38 30.09 16 30.09C22.62 30.09 28 24.71 28 18.09C28 11.47 22.61 6.09 16 6.09ZM19 2H13C12.45 2 12 1.55 12 1C12 0.45 12.45 0 13 0H19C19.55 0 20 0.45 20 1C20 1.55 19.55 2 19 2Z" />
				<path class="asana-minute-hand" d="M15 9C15 8.44771 15.4477 8 16 8V8C16.5523 8 17 8.44772 17 9V18C17 18.5523 16.5523 19 16 19V19C15.4477 19 15 18.5523 15 18V9Z" />
				<path class="asana-hour-hand" d="M15 9C15 8.44771 15.4477 8 16 8V8C16.5523 8 17 8.44772 17 9V18C17 18.5523 16.5523 19 16 19V19C15.4477 19 15 18.5523 15 18V9Z" />
			</g>
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
