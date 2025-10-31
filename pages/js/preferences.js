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
		
		if (data.preferences) {
			const prefs = data.preferences;
			if (prefs.pace) document.getElementById('pace').value = prefs.pace;
			if (prefs.budgetLevel) document.getElementById('budget').value = prefs.budgetLevel;
			if (prefs.travelMode) document.getElementById('travel-mode').value = prefs.travelMode;
			
			if (prefs.diet && Array.isArray(prefs.diet)) {
				prefs.diet.forEach(diet => {
					const checkbox = document.querySelector(`input[name="diet"][value="${diet}"]`);
					if (checkbox) checkbox.checked = true;
				});
			}
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
	const preferences = {
		pace: formData.get('pace'),
		budgetLevel: formData.get('budgetLevel'),
		travelMode: formData.get('travelMode'),
		diet: formData.getAll('diet'),
	};

	try {
		await fetch(`${API_URL}/conversations/${currentConversationId}/preferences`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(preferences),
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

