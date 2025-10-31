import { API_URL } from './config.js';

// Get current conversation ID
let currentConversationId = localStorage.getItem('currentConversationId');
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
	currentConversationId = urlParams.get('id');
	localStorage.setItem('currentConversationId', currentConversationId);
}

const calendarContent = document.getElementById('calendar-content');

if (currentConversationId) {
	loadCalendar();
} else {
	calendarContent.innerHTML = '<p class="empty-state">No conversation selected. Start a conversation to see your calendar.</p>';
}

async function loadCalendar() {
	try {
		const response = await fetch(`${API_URL}/conversations/${currentConversationId}/data`);
		if (!response.ok) throw new Error('Failed to load calendar');
		const data = await response.json();
		
		if (data.itinerary && data.itinerary.days && data.itinerary.days.length > 0) {
			renderCalendar(data.itinerary);
		} else {
			calendarContent.innerHTML = '<p class="empty-state">No calendar items yet. Plan your trip to see it on the calendar!</p>';
		}
	} catch (error) {
		console.error('Failed to load calendar:', error);
		calendarContent.innerHTML = '<p class="empty-state">Failed to load calendar.</p>';
	}
}

function renderCalendar(itinerary) {
	// Group items by date
	const itemsByDate = {};
	itinerary.days.forEach(day => {
		const date = new Date(day.date);
		const key = date.toISOString().split('T')[0];
		itemsByDate[key] = day.items;
	});

	// Get date range
	const dates = Object.keys(itemsByDate).sort();
	if (dates.length === 0) {
		calendarContent.innerHTML = '<p class="empty-state">No items to display</p>';
		return;
	}

	const startDate = new Date(dates[0]);
	const endDate = new Date(dates[dates.length - 1]);
	
	// Generate calendar grid (simple monthly view)
	const today = new Date();
	const firstDay = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
	const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
	
	let html = '<div class="calendar-grid">';
	
	// Day headers
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	dayNames.forEach(day => {
		html += `<div class="calendar-day-header" style="font-weight: 600; text-align: center; padding: 0.5rem;">${day}</div>`;
	});
	
	// Empty cells for days before month starts
	for (let i = 0; i < firstDay.getDay(); i++) {
		html += '<div class="calendar-day"></div>';
	}
	
	// Days of month
	for (let d = 1; d <= lastDay.getDate(); d++) {
		const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), d);
		const key = date.toISOString().split('T')[0];
		const hasEvents = itemsByDate[key] && itemsByDate[key].length > 0;
		
		html += `<div class="calendar-day ${hasEvents ? 'has-events' : ''}">`;
		html += `<div class="day-number">${d}</div>`;
		
		if (hasEvents) {
			html += '<div class="event-list">';
			itemsByDate[key].slice(0, 3).forEach(item => {
				html += `<div class="event-item">${item.timeRange || ''} ${item.title}</div>`;
			});
			if (itemsByDate[key].length > 3) {
				html += `<div class="event-item">+${itemsByDate[key].length - 3} more</div>`;
			}
			html += '</div>';
		}
		
		html += '</div>';
	}
	
	html += '</div>';
	calendarContent.innerHTML = html;
}

