/**
 * Navigation helper - updates links to preserve conversation ID and loads conversation list
 */
import { createConversation } from './api.js';
import { addConversationId, loadConversationList } from './conversations.js';

(function() {
	// Get conversation ID from URL or localStorage
	let currentConversationId = localStorage.getItem('currentConversationId');
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get('id')) {
		currentConversationId = urlParams.get('id');
		localStorage.setItem('currentConversationId', currentConversationId);
	}

	// Update all navigation links to include conversation ID and load conversation list
	document.addEventListener('DOMContentLoaded', () => {
		if (currentConversationId) {
			const navLinks = document.querySelectorAll('nav a.nav-link');
			navLinks.forEach(link => {
				const href = link.getAttribute('href');
				if (href && !href.includes('id=')) {
					const url = new URL(href, window.location.origin);
					url.searchParams.set('id', currentConversationId);
					link.setAttribute('href', url.pathname + url.search);
				}
			});
		}
		
		// Set up New Itinerary button on all pages
		const newItineraryBtn = document.getElementById('new-itinerary-btn');
		if (newItineraryBtn) {
			newItineraryBtn.addEventListener('click', async () => {
				try {
					const { id } = await createConversation();
					addConversationId(id);
					localStorage.setItem('currentConversationId', id);
					window.location.href = `/index.html?id=${id}`;
				} catch (error) {
					console.error('Failed to create conversation:', error);
					alert('Failed to create new conversation');
				}
			});
		}
		
		// Load conversation list in sidebar on all pages
		loadConversationList();
	});
})();

