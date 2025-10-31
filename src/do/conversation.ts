/**
 * Durable Object for managing conversation state and history.
 */

import {
	ConversationMeta,
	ConversationData,
	ChatMessage,
	Itinerary,
	Preferences,
} from "../types";

export class ConversationDO {
	state: DurableObjectState;
	env: any;

	constructor(state: DurableObjectState, env: any) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		try {
			if (method === "GET" && url.pathname === "/meta") {
				return this.getMeta();
			}

			if (method === "GET" && url.pathname === "/data") {
				return this.getData();
			}

			if (method === "GET" && url.pathname === "/messages") {
				const cursor = url.searchParams.get("cursor") || "0";
				const limit = parseInt(url.searchParams.get("limit") || "50");
				return this.getMessages(cursor, limit);
			}

			if (method === "POST" && url.pathname === "/message") {
				const body = (await request.json()) as ChatMessage;
				return this.appendMessage(body);
			}

			if (method === "PUT" && url.pathname === "/itinerary") {
				const body = (await request.json()) as Itinerary;
				return this.updateItinerary(body);
			}

			if (method === "PUT" && url.pathname === "/preferences") {
				const body = (await request.json()) as Preferences;
				return this.updatePreferences(body);
			}

			if (method === "PUT" && url.pathname === "/title") {
				const body = (await request.json()) as { title: string };
				return this.updateTitle(body.title);
			}

			if (method === "DELETE" && url.pathname === "/delete") {
				return this.delete();
			}

			if (method === "POST" && url.pathname === "/initialize") {
				const meta = await this.initialize();
				return Response.json(meta);
			}

			return new Response("Not found", { status: 404 });
		} catch (error) {
			console.error("DO error:", error);
			return new Response(
				JSON.stringify({ error: String(error) }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}
	}

	async getMeta(): Promise<Response> {
		const meta = (await this.state.storage.get("meta")) as
			| ConversationMeta
			| undefined;

		if (!meta) return new Response("Not found", { status: 404 });
		return Response.json(meta);
	}

	async getData(): Promise<Response> {
		const meta = (await this.state.storage.get("meta")) as
			| ConversationMeta
			| undefined;
		const itinerary =
			((await this.state.storage.get("itinerary")) as Itinerary) || {
				days: [],
			};
		const preferences =
			((await this.state.storage.get("preferences")) as Preferences) || {};

		if (!meta) return new Response("Not found", { status: 404 });

		const data: ConversationData = { ...meta, itinerary, preferences };
		return Response.json(data);
	}

	async getMessages(cursor: string, limit: number): Promise<Response> {
		const start = parseInt(cursor) || 0;
		const list = await this.state.storage.list<ChatMessage>({ prefix: "msg:" });
		const all = Array.from(list.values()).sort(
			(a, b) => (a.createdAt || 0) - (b.createdAt || 0),
		);
		const page = all.slice(start, start + limit);
		const nextCursor = start + page.length < all.length ? String(start + page.length) : null;
		return Response.json({ messages: page, cursor: nextCursor });
	}

	async appendMessage(message: ChatMessage): Promise<Response> {
		const createdAt = Date.now();
		const list = await this.state.storage.list({ prefix: "msg:" });
		const index = list.size;
		await this.state.storage.put(`msg:${index.toString().padStart(8, "0")}`, {
			...message,
			createdAt,
		});

		const meta = (await this.state.storage.get("meta")) as ConversationMeta | undefined;
		if (meta) {
			meta.updatedAt = createdAt;
			await this.state.storage.put("meta", meta);
		}
		return Response.json({ success: true });
	}

	async updateItinerary(itinerary: Itinerary): Promise<Response> {
		await this.state.storage.put("itinerary", itinerary);
		await this.touch();
		return Response.json({ success: true });
	}

	async updatePreferences(preferences: Preferences): Promise<Response> {
		await this.state.storage.put("preferences", preferences);
		await this.touch();
		return Response.json({ success: true });
	}

	async updateTitle(title: string): Promise<Response> {
		const meta = (await this.state.storage.get("meta")) as ConversationMeta | undefined;
		if (!meta) return new Response("Not found", { status: 404 });
		meta.title = title;
		await this.state.storage.put("meta", meta);
		await this.touch();
		return Response.json({ success: true });
	}

	async initialize(): Promise<ConversationMeta> {
		const now = Date.now();
		const meta: ConversationMeta = {
			id: this.state.id.toString(),
			title: "New Itinerary",
			createdAt: now,
			updatedAt: now,
		};
		await this.state.storage.put("meta", meta);
		await this.state.storage.put("messageCount", 0);
		await this.state.storage.put("itinerary", { days: [] } satisfies Itinerary);
		await this.state.storage.put("preferences", {} satisfies Preferences);
		return meta;
	}

	async delete(): Promise<Response> {
		// Delete all storage keys for this conversation
		const keys = await this.state.storage.list();
		const deletePromises = Array.from(keys.keys()).map((key) =>
			this.state.storage.delete(key),
		);
		await Promise.all(deletePromises);
		return Response.json({ success: true });
	}

	private async touch() {
		const meta = (await this.state.storage.get("meta")) as ConversationMeta | undefined;
		if (meta) {
			meta.updatedAt = Date.now();
			await this.state.storage.put("meta", meta);
		}
	}
}
