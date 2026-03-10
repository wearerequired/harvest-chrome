const DEFAULT_JSON = `{
  "https://[domain.example]/*": {
    "js": ["js/profiles/[service].js", "js/platform.js"],
    "css": ["css/[service].css"]
  }
}`;

const textarea = document.querySelector('#mapping');
const saveButton = document.querySelector('#save');
const status = document.querySelector('#status');

function setStatus(message, isError = false) {
	status.textContent = message;
	status.style.color = isError ? '#b00020' : '#0a7a0a';
}

function validateMapping(mapping) {
	if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
		throw new Error('Das Root-JSON muss ein Objekt sein.');
	}

	for (const [matchPattern, config] of Object.entries(mapping)) {
		if (!/^https?:\/\/[a-zA-Z0-9.-]+\/\*$/.test(matchPattern)) {
			throw new Error(
				`Ungültiges Match-Pattern: ${matchPattern}. Erwartet wird z. B. https://gitlab.example.com/*`
			);
		}

		if (!config || typeof config !== 'object' || Array.isArray(config)) {
			throw new Error(`Konfiguration für ${matchPattern} muss ein Objekt sein.`);
		}

		if (!Array.isArray(config.js) || config.js.length === 0) {
			throw new Error(`Für ${matchPattern} ist ein nicht-leeres js-Array erforderlich.`);
		}

		if (config.css && !Array.isArray(config.css)) {
			throw new Error(`css für ${matchPattern} muss ein Array sein.`);
		}

		for (const file of config.js) {
			if (typeof file !== 'string' || !file.trim()) {
				throw new Error(`Ungültiger js-Dateiname bei ${matchPattern}.`);
			}
		}

		if (config.css) {
			for (const file of config.css) {
				if (typeof file !== 'string' || !file.trim()) {
					throw new Error(`Ungültiger css-Dateiname bei ${matchPattern}.`);
				}
			}
		}
	}
}

async function loadMappings() {
	const { customContentScriptMappings } = await chrome.storage.local.get('customContentScriptMappings');

	if (customContentScriptMappings) {
		textarea.value = JSON.stringify(customContentScriptMappings, null, 2);
		return;
	}

	textarea.value = DEFAULT_JSON;
}

async function saveMappings() {
	setStatus('');

	let parsed;

	try {
		parsed = JSON.parse(textarea.value);
		validateMapping(parsed);
	} catch (error) {
		setStatus(`Fehler im JSON:\n${error.message}`, true);
		return;
	}

	const origins = Object.keys(parsed);

	const granted = origins.length
		? await chrome.permissions.request({ origins })
		: true;

	if (!granted) {
		setStatus('Host-Berechtigungen wurden nicht gewährt.', true);
		return;
	}

	const response = await chrome.runtime.sendMessage({
		type: 'save-custom-content-script-mappings',
		value: parsed
	});

	console.log('save response', response);

	const stored = await chrome.storage.local.get('customContentScriptMappings');
	console.log('stored after save', stored);

	if (!response?.ok) {
		setStatus(`Speichern fehlgeschlagen:\n${response?.error || 'Unbekannter Fehler'}`, true);
		return;
	}

	setStatus('Gespeichert und registriert.');
}

saveButton.addEventListener('click', saveMappings);
loadMappings().catch((error) => {
	setStatus(`Laden fehlgeschlagen:\n${error.message}`, true);
});