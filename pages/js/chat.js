import { createConversation, getMessages, sendChatMessage } from './api.js';
import { getLocation, getCurrentTime } from './geolocation.js';
import { addConversationId, loadConversationList } from './conversations.js';

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
		assistantEl.innerHTML = '<p></p>';
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
						assistantEl.querySelector('p').textContent = responseText;
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
	messageEl.innerHTML = `<p>${content}</p>`;
	chatMessages.appendChild(messageEl);
	scrollToBottom();
}

function scrollToBottom() {
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

