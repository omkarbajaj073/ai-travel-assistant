import { API_URL } from './config.js';

// Get current conversation ID
let currentConversationId = localStorage.getItem('currentConversationId');
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
	currentConversationId = urlParams.get('id');
	localStorage.setItem('currentConversationId', currentConversationId);
}

const form = document.getElementById('preferences-form');
const saveStatus = document.getElementById('save-status');

// Load existing preferences
if (currentConversationId) {
	loadPreferences();
}

form.addEventListener('submit', handleSubmit);

async function loadPreferences() {
	try {
		const response = await fetch(`${API_URL}/conversations/${currentConversationId}/data`);
		if (!response.ok) throw new Error('Failed to load preferences');
		const data = await response.json();
		
		// Reset all checkboxes first
		document.querySelectorAll('input[name="diet"]').forEach(checkbox => {
			checkbox.checked = false;
		});
		
		if (data.preferences) {
			const prefs = data.preferences;
			// Set select values - use saved value if exists, otherwise keep default
			if (prefs.pace) {
				document.getElementById('pace').value = prefs.pace;
			}
			if (prefs.budgetLevel) {
				document.getElementById('budget').value = prefs.budgetLevel;
			}
			if (prefs.travelMode) {
				document.getElementById('travel-mode').value = prefs.travelMode;
			}
			// Set miscellaneous - clear if not in saved prefs
			document.getElementById('miscellaneous').value = prefs.miscellaneous || '';
			
			// Set dietary checkboxes
			if (prefs.diet && Array.isArray(prefs.diet)) {
				prefs.diet.forEach(diet => {
					const checkbox = document.querySelector(`input[name="diet"][value="${diet}"]`);
					if (checkbox) checkbox.checked = true;
				});
			}
		} else {
			// No preferences saved, reset to defaults
			document.getElementById('miscellaneous').value = '';
		}
	} catch (error) {
		console.error('Failed to load preferences:', error);
	}
}

async function handleSubmit(e) {
	e.preventDefault();
	
	if (!currentConversationId) {
		showStatus('Please create a conversation first', 'error');
		return;
	}

	const formData = new FormData(form);
	const preferences = {};
	
	// Collect all form values (selects always have values, so include them)
	const pace = formData.get('pace');
	if (pace) preferences.pace = pace;
	
	const budgetLevel = formData.get('budgetLevel');
	if (budgetLevel) preferences.budgetLevel = budgetLevel;
	
	const travelMode = formData.get('travelMode');
	if (travelMode) preferences.travelMode = travelMode;
	
	const diet = formData.getAll('diet');
	// Always include diet array, even if empty
	preferences.diet = diet && diet.length > 0 ? diet : [];
	
	const miscellaneous = formData.get('miscellaneous');
	// Always include miscellaneous (even if empty) so we can clear it if user deletes content
	preferences.miscellaneous = miscellaneous ? miscellaneous.trim() : '';

	try {
		// Load existing preferences first to ensure we don't lose any
		const currentDataResponse = await fetch(`${API_URL}/conversations/${currentConversationId}/data`);
		let existingPrefs = {};
		
		if (currentDataResponse.ok) {
			const currentData = await currentDataResponse.json();
			existingPrefs = currentData.preferences || {};
		}
		
		// Merge: existing preferences first, then overlay with new form values
		// This preserves any existing preferences that aren't in the form
		const mergedPreferences = { ...existingPrefs, ...preferences };
		
		console.log('Saving preferences:', mergedPreferences);
		
		await fetch(`${API_URL}/conversations/${currentConversationId}/preferences`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(mergedPreferences),
		});
		showStatus('Preferences saved successfully!', 'success');
	} catch (error) {
		console.error('Failed to save preferences:', error);
		showStatus('Failed to save preferences', 'error');
	}
}

function showStatus(message, type) {
	saveStatus.textContent = message;
	saveStatus.className = `status-message ${type}`;
	setTimeout(() => {
		saveStatus.className = 'status-message';
		saveStatus.textContent = '';
	}, 3000);
}

