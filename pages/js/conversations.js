/**
 * Conversation list management
 */

import { getConversations, updateConversationTitle, deleteConversation } from './api.js';

/**
 * Get all conversation IDs from localStorage
 */
export function getConversationIds() {
	const idsJson = localStorage.getItem('conversationIds');
	if (!idsJson) return [];
	try {
		return JSON.parse(idsJson);
	} catch {
		return [];
	}
}

/**
 * Add a conversation ID to the list (if not already present)
 */
export function addConversationId(id) {
	const ids = getConversationIds();
	if (!ids.includes(id)) {
		ids.unshift(id); // Add to beginning
		// Keep only last 50 conversations
		const limited = ids.slice(0, 50);
		localStorage.setItem('conversationIds', JSON.stringify(limited));
		return limited;
	}
	return ids;
}

/**
 * Remove a conversation ID from localStorage
 */
function removeConversationId(id) {
	const ids = getConversationIds();
	const filtered = ids.filter(i => i !== id);
	localStorage.setItem('conversationIds', JSON.stringify(filtered));
	return filtered;
}

/**
 * Load and render conversation list in sidebar
 */
export async function loadConversationList() {
	const conversationsList = document.getElementById('conversations-list');
	if (!conversationsList) return;

	const ids = getConversationIds();
	if (ids.length === 0) {
		conversationsList.innerHTML = '<p style="padding: 0.5rem; color: var(--text-light); font-size: 0.85rem;">No conversations yet</p>';
		return;
	}

	try {
		const { conversations } = await getConversations(ids);
		conversationsList.innerHTML = '';

		// Remove any existing context menu
		const existingMenu = document.getElementById('conversation-context-menu');
		if (existingMenu) {
			existingMenu.remove();
		}

		conversations.forEach(convo => {
			const item = document.createElement('div');
			item.className = 'conversation-item';
			const currentId = localStorage.getItem('currentConversationId');
			if (convo.id === currentId) {
				item.classList.add('active');
			}
			
			item.textContent = convo.title || 'Untitled';
			item.title = convo.title || 'Untitled';
			
			// Left click to navigate
			item.addEventListener('click', () => {
				localStorage.setItem('currentConversationId', convo.id);
				window.location.href = `/index.html?id=${convo.id}`;
			});

			// Right click for context menu
			item.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				showContextMenu(e, convo);
			});
			
			conversationsList.appendChild(item);
		});

		// Close context menu on click outside
		document.addEventListener('click', closeContextMenu);
		document.addEventListener('contextmenu', (e) => {
			if (!e.target.closest('.conversation-item')) {
				closeContextMenu();
			}
		});
	} catch (error) {
		console.error('Failed to load conversation list:', error);
		conversationsList.innerHTML = '<p style="padding: 0.5rem; color: var(--text-light); font-size: 0.85rem;">Failed to load conversations</p>';
	}
}

function showContextMenu(event, convo) {
	closeContextMenu();

	const menu = document.createElement('div');
	menu.id = 'conversation-context-menu';
	menu.className = 'context-menu';
	menu.style.left = `${event.pageX}px`;
	menu.style.top = `${event.pageY}px`;

	const renameOption = document.createElement('div');
	renameOption.className = 'context-menu-item';
	renameOption.textContent = 'Rename';
	renameOption.addEventListener('click', () => {
		renameConversation(convo);
		closeContextMenu();
	});

	const deleteOption = document.createElement('div');
	deleteOption.className = 'context-menu-item';
	deleteOption.textContent = 'Delete';
	deleteOption.addEventListener('click', () => {
		deleteConversationHandler(convo.id);
		closeContextMenu();
	});

	menu.appendChild(renameOption);
	menu.appendChild(deleteOption);
	document.body.appendChild(menu);
}

function closeContextMenu() {
	const menu = document.getElementById('conversation-context-menu');
	if (menu) {
		menu.remove();
	}
}

async function renameConversation(convo) {
	const newTitle = prompt('Enter new title:', convo.title || 'Untitled');
	if (newTitle && newTitle.trim() && newTitle !== convo.title) {
		try {
			await updateConversationTitle(convo.id, newTitle.trim());
			await loadConversationList();
		} catch (error) {
			console.error('Failed to rename conversation:', error);
			alert('Failed to rename conversation');
		}
	}
}

async function deleteConversationHandler(id) {
	if (!confirm('Are you sure you want to delete this conversation?')) {
		return;
	}

	try {
		await deleteConversation(id);
		removeConversationId(id);
		
		// If deleted conversation was current, clear it
		const currentId = localStorage.getItem('currentConversationId');
		if (currentId === id) {
			localStorage.removeItem('currentConversationId');
			// Redirect to new conversation if on chat page
			if (window.location.pathname.includes('index.html')) {
				window.location.href = '/index.html';
			}
		}
		
		await loadConversationList();
	} catch (error) {
		console.error('Failed to delete conversation:', error);
		alert('Failed to delete conversation');
	}
}

