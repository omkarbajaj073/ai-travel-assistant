import { API_URL } from './config.js';

console.log('[ITINERARY] Script loading...');

// Get current conversation ID
let currentConversationId = localStorage.getItem('currentConversationId');
console.log('[ITINERARY] Initial currentConversationId from localStorage:', currentConversationId);

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
	currentConversationId = urlParams.get('id');
	localStorage.setItem('currentConversationId', currentConversationId);
	console.log('[ITINERARY] Updated currentConversationId from URL:', currentConversationId);
}

const itineraryContent = document.getElementById('itinerary-content');
console.log('[ITINERARY] itineraryContent element:', itineraryContent);

if (currentConversationId) {
	console.log('[ITINERARY] Calling loadItinerary with conversationId:', currentConversationId);
	loadItinerary();
} else {
	console.log('[ITINERARY] No currentConversationId, showing empty state');
	itineraryContent.innerHTML = '<p class="empty-state">No conversation selected. Start a conversation to see your itinerary.</p>';
}

// Listen for itinerary update events (when itinerary is saved from chat page)
window.addEventListener('itineraryUpdated', (event) => {
	console.log('[ITINERARY] Received itineraryUpdated event:', event.detail);
	const { conversationId } = event.detail;
	console.log('[ITINERARY] Event conversationId:', conversationId, 'currentConversationId:', currentConversationId);
	// Only reload if it's the current conversation
	if (conversationId === currentConversationId) {
		console.log('[ITINERARY] Conversation IDs match, reloading itinerary');
		loadItinerary();
	} else {
		console.log('[ITINERARY] Conversation IDs do not match, skipping reload');
	}
});

/**
 * Transforms itinerary from storage format to expected display format.
 * Handles both formats: legacy (day/activities/time/activity) and standard (date/items/timeRange/title).
 */
function transformItinerary(itinerary) {
	if (!itinerary || !itinerary.days) return itinerary;
	
	console.log('[ITINERARY] Transforming itinerary from format:', JSON.stringify(itinerary, null, 2));
	
	const transformed = {
		days: itinerary.days.map((day, index) => {
			// Check if this is legacy format (has 'day' number and 'activities')
			if (day.day !== undefined && day.activities) {
				console.log(`[ITINERARY] Day ${index} is legacy format, transforming...`);
				
				// Generate a date if missing (use today + day number)
				const baseDate = new Date();
				baseDate.setDate(baseDate.getDate() + (day.day - 1));
				const dateString = baseDate.toISOString().split('T')[0];
				
				return {
					date: dateString,
					items: day.activities.map((activity, actIndex) => ({
						id: `day-${day.day}-item-${actIndex}`,
						timeRange: activity.time || activity.timeRange,
						title: activity.activity || activity.title,
						location: activity.location,
						notes: activity.notes
					}))
				};
			}
			
			// Already in correct format, but ensure 'date' exists
			if (!day.date && day.day !== undefined) {
				const baseDate = new Date();
				baseDate.setDate(baseDate.getDate() + (day.day - 1));
				day.date = baseDate.toISOString().split('T')[0];
			}
			
			// Ensure 'items' exists (might be called 'activities')
			if (!day.items && day.activities) {
				day.items = day.activities.map((activity, actIndex) => ({
					id: activity.id || `item-${actIndex}`,
					timeRange: activity.time || activity.timeRange,
					title: activity.activity || activity.title,
					location: activity.location,
					notes: activity.notes
				}));
			}
			
			return day;
		})
	};
	
	console.log('[ITINERARY] Transformed itinerary:', JSON.stringify(transformed, null, 2));
	return transformed;
}

async function loadItinerary() {
	console.log('[ITINERARY] loadItinerary() called with conversationId:', currentConversationId);
	console.log('[ITINERARY] API_URL:', API_URL);
	
	const url = `${API_URL}/conversations/${currentConversationId}/data`;
	console.log('[ITINERARY] Fetching from URL:', url);
	
	try {
		const response = await fetch(url);
		console.log('[ITINERARY] Response status:', response.status, response.statusText);
		console.log('[ITINERARY] Response ok:', response.ok);
		console.log('[ITINERARY] Response headers:', Object.fromEntries(response.headers.entries()));
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[ITINERARY] Response not ok, error text:', errorText);
			throw new Error('Failed to load itinerary');
		}
		
		const data = await response.json();
		console.log('[ITINERARY] Received data:', JSON.stringify(data, null, 2));
		console.log('[ITINERARY] data.itinerary:', data.itinerary);
		console.log('[ITINERARY] data.itinerary type:', typeof data.itinerary);
		console.log('[ITINERARY] data.itinerary?.days:', data.itinerary?.days);
		console.log('[ITINERARY] data.itinerary?.days type:', typeof data.itinerary?.days);
		console.log('[ITINERARY] data.itinerary?.days length:', data.itinerary?.days?.length);
		console.log('[ITINERARY] Condition check - data.itinerary:', !!data.itinerary);
		console.log('[ITINERARY] Condition check - data.itinerary.days:', !!data.itinerary?.days);
		console.log('[ITINERARY] Condition check - data.itinerary.days.length > 0:', data.itinerary?.days?.length > 0);
		
		if (data.itinerary && data.itinerary.days && data.itinerary.days.length > 0) {
			console.log('[ITINERARY] Itinerary has days, transforming and rendering');
			const transformed = transformItinerary(data.itinerary);
			renderItinerary(transformed);
		} else {
			console.log('[ITINERARY] No itinerary or empty days array, showing empty state');
			console.log('[ITINERARY] data.itinerary exists:', !!data.itinerary);
			if (data.itinerary) {
				console.log('[ITINERARY] itinerary structure:', Object.keys(data.itinerary));
				console.log('[ITINERARY] itinerary.days:', data.itinerary.days);
			}
			itineraryContent.innerHTML = '<p class="empty-state">No itinerary items yet. Start a conversation to plan your trip!</p>';
		}
	} catch (error) {
		console.error('[ITINERARY] Error in loadItinerary:', error);
		console.error('[ITINERARY] Error stack:', error.stack);
		itineraryContent.innerHTML = '<p class="empty-state">Failed to load itinerary.</p>';
	}
}

function renderItinerary(itinerary) {
	console.log('[ITINERARY] renderItinerary() called with:', JSON.stringify(itinerary, null, 2));
	console.log('[ITINERARY] itinerary.days:', itinerary.days);
	console.log('[ITINERARY] itinerary.days.length:', itinerary.days?.length);
	
	const html = itinerary.days.map((day, dayIndex) => {
		console.log(`[ITINERARY] Processing day ${dayIndex}:`, day);
		console.log(`[ITINERARY] Day ${dayIndex} date:`, day.date);
		console.log(`[ITINERARY] Day ${dayIndex} items:`, day.items);
		console.log(`[ITINERARY] Day ${dayIndex} items length:`, day.items?.length);
		
		const items = day.items.map((item, itemIndex) => {
			console.log(`[ITINERARY] Day ${dayIndex}, Item ${itemIndex}:`, item);
			return `
			<div class="itinerary-item">
				${item.timeRange ? `<div class="item-time">${item.timeRange}</div>` : ''}
				<div class="item-title">${item.title}</div>
				${item.location?.name ? `<div class="item-location">📍 ${item.location.name}</div>` : ''}
				${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
			</div>
		`;
		}).join('');
		
		return `
			<div class="day-section">
				<div class="day-header">${formatDate(day.date)}</div>
				${items}
			</div>
		`;
	}).join('');
	
	console.log('[ITINERARY] Generated HTML length:', html.length);
	console.log('[ITINERARY] Generated HTML preview:', html.substring(0, 500));
	
	itineraryContent.innerHTML = html;
	console.log('[ITINERARY] HTML set to itineraryContent element');
}

function formatDate(dateString) {
	console.log('[ITINERARY] formatDate() called with:', dateString);
	const date = new Date(dateString);
	console.log('[ITINERARY] Parsed date:', date);
	const formatted = date.toLocaleDateString('en-US', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});
	console.log('[ITINERARY] Formatted date:', formatted);
	return formatted;
}

