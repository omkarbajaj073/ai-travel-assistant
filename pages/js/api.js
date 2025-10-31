import { API_URL } from './config.js';

/**
 * API client for Travel Agent backend
 */

export async function createConversation() {
	const response = await fetch(`${API_URL}/conversations`, {
		method: 'POST',
	});
	if (!response.ok) throw new Error('Failed to create conversation');
	return response.json();
}

export async function getConversations(ids) {
	if (!ids || ids.length === 0) return { conversations: [] };
	const idsParam = ids.join(',');
	const response = await fetch(`${API_URL}/conversations?ids=${idsParam}`);
	if (!response.ok) throw new Error('Failed to fetch conversations');
	return response.json();
}

export async function getConversationData(id) {
	const response = await fetch(`${API_URL}/conversations/${id}/data`);
	if (!response.ok) throw new Error('Failed to fetch conversation');
	return response.json();
}

export async function getMessages(id, cursor = '0', limit = 50) {
	const response = await fetch(
		`${API_URL}/conversations/${id}/messages?cursor=${cursor}&limit=${limit}`
	);
	if (!response.ok) throw new Error('Failed to fetch messages');
	return response.json();
}

export async function sendChatMessage(id, messages, location) {
	const response = await fetch(`${API_URL}/conversations/${id}/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ messages, location }),
	});
	if (!response.ok) throw new Error('Failed to send message');
	return response;
}

export async function updatePreferences(id, preferences) {
	const response = await fetch(`${API_URL}/conversations/${id}/preferences`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(preferences),
	});
	if (!response.ok) throw new Error('Failed to update preferences');
	return response.json();
}

export async function updateItinerary(id, itinerary) {
	const response = await fetch(`${API_URL}/conversations/${id}/itinerary`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(itinerary),
	});
	if (!response.ok) throw new Error('Failed to update itinerary');
	return response.json();
}

export async function updateConversationTitle(id, title) {
	const response = await fetch(`${API_URL}/conversations/${id}/title`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title }),
	});
	if (!response.ok) throw new Error('Failed to update conversation title');
	return response.json();
}

export async function deleteConversation(id) {
	const response = await fetch(`${API_URL}/conversations/${id}`, {
		method: 'DELETE',
	});
	if (!response.ok) throw new Error('Failed to delete conversation');
	return response.json();
}

