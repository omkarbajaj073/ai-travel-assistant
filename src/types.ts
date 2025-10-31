/**
 * Type definitions for the Travel Agent application.
 */

export interface Env {
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for Durable Objects namespace of conversations.
	 */
	CONVERSATIONS: DurableObjectNamespace;

	/**
	 * Optional binding for static assets (used during local dev).
	 * In production, Cloudflare Pages serves the UI.
	 */
	ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
	createdAt?: number;
}

/**
 * User preferences for travel planning.
 */
export interface Preferences {
	diet?: string[];
	travelMode?: string;
	pace?: "relaxed" | "balanced" | "aggressive";
	budgetLevel?: "low" | "mid" | "high";
}

/**
 * Itinerary item.
 */
export interface ItineraryItem {
	id: string;
	timeRange?: string;
	title: string;
	location?: {
		name?: string;
		address?: string;
		lat?: number;
		lon?: number;
	};
	notes?: string;
}

/**
 * Day in itinerary.
 */
export interface Day {
	date: string;
	items: ItineraryItem[];
}

/**
 * Complete itinerary structure.
 */
export interface Itinerary {
	days: Day[];
}

/**
 * Conversation metadata.
 */
export interface ConversationMeta {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
}

/**
 * Full conversation data (without messages).
 */
export interface ConversationData extends ConversationMeta {
	itinerary: Itinerary;
	preferences: Preferences;
}

/**
 * Location/time context from client.
 */
export interface LocationContext {
	time?: string;
	lat?: number;
	lon?: number;
}

/**
 * Durable Object interface.
 */
export interface ConversationDO {
	fetch(request: Request): Promise<Response>;
}
