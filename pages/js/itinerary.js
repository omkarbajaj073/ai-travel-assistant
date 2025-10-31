import { API_URL } from './config.js';

// Get current conversation ID
let currentConversationId = localStorage.getItem('currentConversationId');
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
	currentConversationId = urlParams.get('id');
	localStorage.setItem('currentConversationId', currentConversationId);
}

const itineraryContent = document.getElementById('itinerary-content');

if (currentConversationId) {
	loadItinerary();
} else {
	itineraryContent.innerHTML = '<p class="empty-state">No conversation selected. Start a conversation to see your itinerary.</p>';
}

async function loadItinerary() {
	try {
		const response = await fetch(`${API_URL}/conversations/${currentConversationId}/data`);
		if (!response.ok) throw new Error('Failed to load itinerary');
		const data = await response.json();
		
		if (data.itinerary && data.itinerary.days && data.itinerary.days.length > 0) {
			renderItinerary(data.itinerary);
		} else {
			itineraryContent.innerHTML = '<p class="empty-state">No itinerary items yet. Start a conversation to plan your trip!</p>';
		}
	} catch (error) {
		console.error('Failed to load itinerary:', error);
		itineraryContent.innerHTML = '<p class="empty-state">Failed to load itinerary.</p>';
	}
}

function renderItinerary(itinerary) {
	const html = itinerary.days.map(day => {
		const items = day.items.map(item => `
			<div class="itinerary-item">
				${item.timeRange ? `<div class="item-time">${item.timeRange}</div>` : ''}
				<div class="item-title">${item.title}</div>
				${item.location?.name ? `<div class="item-location">📍 ${item.location.name}</div>` : ''}
				${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
			</div>
		`).join('');
		
		return `
			<div class="day-section">
				<div class="day-header">${formatDate(day.date)}</div>
				${items}
			</div>
		`;
	}).join('');
	
	itineraryContent.innerHTML = html;
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});
}

