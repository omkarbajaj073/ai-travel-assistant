import { createConversation, getMessages, sendChatMessage, updateItinerary } from './api.js';
import { getLocation, getCurrentTime } from './geolocation.js';
import { addConversationId, loadConversationList } from './conversations.js';

// Initialize Showdown markdown converter
const converter = new showdown.Converter({
	simplifiedAutoLink: true,
	strikethrough: true,
	tables: true,
	tasklists: true
});

// Get current conversation ID from URL or localStorage
let currentConversationId = localStorage.getItem('currentConversationId');
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
	currentConversationId = urlParams.get('id');
	localStorage.setItem('currentConversationId', currentConversationId);
	addConversationId(currentConversationId);
}

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const newItineraryBtn = document.getElementById('new-itinerary-btn');

let isProcessing = false;
let messageHistory = [];

// Initialize
if (currentConversationId) {
	addConversationId(currentConversationId);
	loadConversation(currentConversationId);
}
// Load conversation list in sidebar
loadConversationList();
// Always set up the button listener
newItineraryBtn.addEventListener('click', createNewConversation);

sendButton.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		handleSend();
	}
});

userInput.addEventListener('input', function() {
	this.style.height = 'auto';
	this.style.height = this.scrollHeight + 'px';
});

async function createNewConversation() {
	try {
		const { id } = await createConversation();
		addConversationId(id);
		currentConversationId = id;
		localStorage.setItem('currentConversationId', id);
		window.location.href = `/index.html?id=${id}`;
	} catch (error) {
		console.error('Failed to create conversation:', error);
		alert('Failed to create new conversation');
	}
}

async function loadConversation(id) {
	try {
		const data = await getMessages(id);
		messageHistory = data.messages || [];
		renderMessages();
	} catch (error) {
		console.error('Failed to load conversation:', error);
	}
}

function renderMessages() {
	chatMessages.innerHTML = '';
	if (messageHistory.length === 0) {
		// Show welcome message if no history
		const welcomeMsg = document.createElement('div');
		welcomeMsg.className = 'message assistant-message';
		welcomeMsg.innerHTML = '<p>Hello! I\'m your travel agent. Start planning your trip by telling me where you want to go and what you\'d like to do.</p>';
		chatMessages.appendChild(welcomeMsg);
	} else {
		// Render all messages including assistant messages
		messageHistory.forEach(msg => {
			// Only filter out system messages, show both user and assistant
			if (msg.role !== 'system' && msg.content) {
				addMessageToChat(msg.role, msg.content);
			}
		});
	}
	scrollToBottom();
}

async function handleSend() {
	const message = userInput.value.trim();
	if (!message || isProcessing) return;
	
	// Create conversation if needed
	if (!currentConversationId) {
		try {
			const { id } = await createConversation();
			addConversationId(id);
			currentConversationId = id;
			localStorage.setItem('currentConversationId', id);
			// Update URL without reload
			const url = new URL(window.location);
			url.searchParams.set('id', id);
			window.history.pushState({}, '', url);
			// Reload conversation list
			loadConversationList();
		} catch (error) {
			console.error('Failed to create conversation:', error);
			alert('Failed to create new conversation');
			return;
		}
	}

	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;
	userInput.value = '';
	userInput.style.height = 'auto';

	// Add user message to UI
	addMessageToChat('user', message);

	// Add to history
	const userMsg = { role: 'user', content: message };
	messageHistory.push(userMsg);

	// Get location if available
	const location = await getLocation();
	if (location) {
		location.time = getCurrentTime();
	}

	// Show typing indicator
	typingIndicator.classList.add('visible');

	try {
		// Create assistant message element
		const assistantEl = document.createElement('div');
		assistantEl.className = 'message assistant-message';
		assistantEl.innerHTML = '';
		chatMessages.appendChild(assistantEl);
		scrollToBottom();

		// Send request to API (use conversation endpoint for persistence)
		const response = await sendChatMessage(currentConversationId, messageHistory, location);

		// Handle errors
		if (!response.ok) {
			throw new Error('Failed to get response');
		}

		if (!response.body) {
			throw new Error('No response body');
		}

		// Process streaming response (template-style inline parsing)
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let responseText = '';

		// Helper function to filter content for display (remove JSON after magic sequence)
		function filterContentForDisplay(content) {
			const magicSequence = '<!--ITINERARY_JSON-->';
			const magicIndex = content.indexOf(magicSequence);
			if (magicIndex !== -1) {
				// Remove everything from the magic sequence onwards
				return content.substring(0, magicIndex).trim();
			}
			return content;
		}

		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			// Decode chunk
			const chunk = decoder.decode(value, { stream: true });

			// Process each line (template-style)
			const lines = chunk.split('\n');
			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const jsonData = JSON.parse(line);
					if (jsonData.response) {
						// Append new content to existing text
						responseText += jsonData.response;
						// Filter content for display (remove JSON after magic sequence)
						const filteredForDisplay = filterContentForDisplay(responseText);
						// Convert markdown to HTML and render
						const html = converter.makeHtml(filteredForDisplay);
						assistantEl.innerHTML = html;
						scrollToBottom();
					}
				} catch (e) {
					// Not JSON, might be plain text or other format - skip
				}
			}
		}

		// Add completed response to chat history (DO already persisted it)
		if (responseText.trim()) {
			messageHistory.push({ role: 'assistant', content: responseText });
			
			// Extract and save itinerary if present in the response
			const extractedItinerary = extractItineraryFromResponse(responseText);
			if (extractedItinerary) {
				try {
					await updateItinerary(currentConversationId, extractedItinerary);
					console.log('Itinerary saved successfully');
					// Dispatch event to notify other tabs/pages that itinerary was updated
					window.dispatchEvent(new CustomEvent('itineraryUpdated', { 
						detail: { conversationId: currentConversationId, itinerary: extractedItinerary } 
					}));
				} catch (error) {
					console.error('Failed to save itinerary:', error);
				}
			}
		}
	} catch (error) {
		console.error('Error:', error);
		addMessageToChat('assistant', 'Sorry, there was an error processing your request.');
	} finally {
		// Hide typing indicator
		typingIndicator.classList.remove('visible');

		// Re-enable input
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

function addMessageToChat(role, content) {
	const messageEl = document.createElement('div');
	messageEl.className = `message ${role}-message`;
	
	// Filter out JSON blocks from assistant messages
	let filteredContent = content;
	if (role === 'assistant') {
		// Check for magic sequence separator - remove everything after it
		const magicSequence = '<!--ITINERARY_JSON-->';
		const magicIndex = filteredContent.indexOf(magicSequence);
		if (magicIndex !== -1) {
			// Remove everything from the magic sequence onwards
			filteredContent = filteredContent.substring(0, magicIndex).trim();
		} else {
			// Fallback: Remove JSON code blocks that contain itinerary data
			filteredContent = filteredContent.replace(/```json\s*[\s\S]*?```/g, '');
			filteredContent = filteredContent.replace(/```\s*\{[\s\S]*?"days"[\s\S]*?\}\s*```/g, '');
			// Remove standalone JSON objects with itinerary structure
			filteredContent = filteredContent.replace(/\{\s*"days"\s*:[\s\S]*?\}/g, '');
			filteredContent = filteredContent.trim();
		}
		
		// Convert markdown to HTML for assistant messages
		const html = converter.makeHtml(filteredContent);
		messageEl.innerHTML = html;
	} else {
		// User messages: plain text
		messageEl.innerHTML = `<p>${filteredContent}</p>`;
	}
	
	chatMessages.appendChild(messageEl);
	scrollToBottom();
}

function scrollToBottom() {
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Validates and normalizes an itinerary to ensure it follows the correct schema.
 * @param {Object} itinerary - The parsed itinerary object
 * @returns {Object|null} - The normalized itinerary or null if invalid
 */
function validateAndNormalizeItinerary(itinerary) {
	if (!itinerary || typeof itinerary !== 'object' || !Array.isArray(itinerary.days)) {
		console.log('[EXTRACT] Invalid itinerary: missing days array');
		return null;
	}
	
	const normalized = {
		days: itinerary.days.map((day, dayIndex) => {
			// Ensure 'date' exists (required)
			if (!day.date) {
				// Generate date from day number if present
				if (day.day !== undefined) {
					const baseDate = new Date();
					baseDate.setDate(baseDate.getDate() + (day.day - 1));
					day.date = baseDate.toISOString().split('T')[0];
				} else {
					// Use today + day index as fallback
					const baseDate = new Date();
					baseDate.setDate(baseDate.getDate() + dayIndex);
					day.date = baseDate.toISOString().split('T')[0];
				}
			}
			
			// Ensure 'items' exists (required) - check for legacy 'activities' field
			if (!day.items && day.activities) {
				day.items = day.activities;
			}
			if (!Array.isArray(day.items)) {
				console.log(`[EXTRACT] Invalid day ${dayIndex}: missing items array`);
				return null;
			}
			
			// Normalize items
			const items = day.items.map((item, itemIndex) => {
				const normalizedItem = { ...item };
				
				// Ensure 'id' exists (required)
				if (!normalizedItem.id) {
					normalizedItem.id = `day-${dayIndex + 1}-item-${itemIndex + 1}`;
				}
				
				// Normalize 'title' - check for legacy 'activity' field
				if (!normalizedItem.title && normalizedItem.activity) {
					normalizedItem.title = normalizedItem.activity;
					delete normalizedItem.activity;
				}
				if (!normalizedItem.title) {
					console.log(`[EXTRACT] Invalid item ${itemIndex} in day ${dayIndex}: missing title`);
					return null;
				}
				
				// Normalize 'timeRange' - check for legacy 'time' field
				if (!normalizedItem.timeRange && normalizedItem.time) {
					normalizedItem.timeRange = normalizedItem.time;
					delete normalizedItem.time;
				}
				
				return normalizedItem;
			}).filter(item => item !== null); // Remove invalid items
			
			return {
				date: day.date,
				items: items
			};
		}).filter(day => day !== null && day.items.length > 0) // Remove invalid days
	};
	
	if (normalized.days.length === 0) {
		console.log('[EXTRACT] No valid days after normalization');
		return null;
	}
	
	console.log('[EXTRACT] Validated and normalized itinerary:', JSON.stringify(normalized, null, 2));
	return normalized;
}

/**
 * Extracts itinerary JSON from AI response text.
 * Looks for magic sequence first, then extracts JSON after it.
 * Falls back to searching for JSON code blocks if magic sequence not found.
 * @param {string} text - The AI response text
 * @returns {Object|null} - The parsed and validated itinerary object or null if not found
 */
function extractItineraryFromResponse(text) {
	if (!text) return null;
	
	const magicSequence = '<!--ITINERARY_JSON-->';
	const magicIndex = text.indexOf(magicSequence);
	
	if (magicIndex !== -1) {
		console.log('[EXTRACT] Found magic sequence, extracting JSON after it');
		// Extract everything after the magic sequence
		const jsonSection = text.substring(magicIndex + magicSequence.length).trim();
		
		// Try to extract from JSON code blocks after magic sequence
		const jsonCodeBlockRegex = /```json\s*([\s\S]*?)```/;
		let match = jsonSection.match(jsonCodeBlockRegex);
		if (match) {
			try {
				const parsed = JSON.parse(match[1].trim());
				if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
					console.log('[EXTRACT] Found itinerary in JSON code block after magic sequence');
					return validateAndNormalizeItinerary(parsed);
				}
			} catch (e) {
				console.log('[EXTRACT] Failed to parse JSON code block after magic sequence:', e);
			}
		}
		
		// Try to extract from generic code blocks after magic sequence
		const codeBlockRegex = /```[^`]*?\n?([\s\S]*?)```/;
		match = jsonSection.match(codeBlockRegex);
		if (match) {
			try {
				const parsed = JSON.parse(match[1].trim());
				if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
					console.log('[EXTRACT] Found itinerary in generic code block after magic sequence');
					return validateAndNormalizeItinerary(parsed);
				}
			} catch (e) {
				console.log('[EXTRACT] Failed to parse generic code block after magic sequence:', e);
			}
		}
		
		// Try to find standalone JSON after magic sequence
		const standaloneJsonRegex = /\{\s*"days"\s*:[\s\S]*?\}/;
		match = jsonSection.match(standaloneJsonRegex);
		if (match) {
			try {
				const parsed = JSON.parse(match[0]);
				if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
					console.log('[EXTRACT] Found itinerary as standalone JSON after magic sequence');
					return validateAndNormalizeItinerary(parsed);
				}
			} catch (e) {
				console.log('[EXTRACT] Failed to parse standalone JSON after magic sequence:', e);
			}
		}
		
		console.log('[EXTRACT] Magic sequence found but no valid JSON after it');
	}
	
	// Fallback: Try to extract from JSON code blocks anywhere in text
	console.log('[EXTRACT] Magic sequence not found, trying fallback extraction methods');
	const jsonCodeBlockRegex = /```json\s*([\s\S]*?)```/g;
	let match;
	while ((match = jsonCodeBlockRegex.exec(text)) !== null) {
		try {
			const parsed = JSON.parse(match[1].trim());
			if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
				console.log('[EXTRACT] Found itinerary in JSON code block (fallback)');
				return validateAndNormalizeItinerary(parsed);
			}
		} catch (e) {
			console.log('[EXTRACT] Failed to parse JSON code block (fallback):', e);
			// Not valid JSON, continue
		}
	}
	
	// Try to extract from generic code blocks
	const codeBlockRegex = /```[^`]*?\n?([\s\S]*?)```/g;
	while ((match = codeBlockRegex.exec(text)) !== null) {
		try {
			const parsed = JSON.parse(match[1].trim());
			if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
				console.log('[EXTRACT] Found itinerary in generic code block (fallback)');
				return validateAndNormalizeItinerary(parsed);
			}
		} catch (e) {
			console.log('[EXTRACT] Failed to parse generic code block (fallback):', e);
			// Not valid JSON, continue
		}
	}
	
	// Try to find standalone JSON objects with "days" property
	const standaloneJsonRegex = /\{\s*"days"\s*:[\s\S]*?\}/;
	const standaloneMatch = text.match(standaloneJsonRegex);
	if (standaloneMatch) {
		try {
			const parsed = JSON.parse(standaloneMatch[0]);
			if (parsed && typeof parsed === 'object' && Array.isArray(parsed.days)) {
				console.log('[EXTRACT] Found itinerary as standalone JSON (fallback)');
				return validateAndNormalizeItinerary(parsed);
			}
		} catch (e) {
			console.log('[EXTRACT] Failed to parse standalone JSON (fallback):', e);
			// Not valid JSON
		}
	}
	
	console.log('[EXTRACT] No valid itinerary found in response');
	return null;
}

