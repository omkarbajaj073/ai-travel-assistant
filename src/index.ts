/**
 * Travel Agent Worker
 */
import {
	Env,
	ChatMessage,
	ConversationData,
	LocationContext,
	Preferences,
	Itinerary,
} from "./types";
import { ConversationDO } from "./do/conversation";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Travel Agent - orchestrates AI reasoning with context and tools
 * Structured as an Agent class for better organization
 */
class TravelAgent {
	env: Env;
	modelId: string;

	constructor(env: Env) {
		this.env = env;
		this.modelId = MODEL_ID;
	}

	buildSystemPrompt(context: {
		preferences?: Preferences;
		itinerary?: Itinerary;
		location?: LocationContext;
	}): string {
		const prefs = context.preferences
			? JSON.stringify(context.preferences, null, 2)
			: "{}";
		const itin = context.itinerary
			? JSON.stringify(context.itinerary, null, 2)
			: "{}";
		const loc = context.location
			? JSON.stringify(context.location, null, 2)
			: "{}";

		return `You are an expert travel agent assistant. Help users plan and manage their travel itineraries.

User Preferences:
${prefs}

Current Itinerary:
${itin}

Location/Time Context:
${loc}

Guidelines:
- Be concise, practical, and proactive
- Reference the itinerary when answering questions
- Consider user preferences (pace, diet, budget, travel mode)
- When user is on-site, use their current location/time to suggest nearby options
- You can help modify the itinerary, suggest activities, find places near the user, and answer travel questions.`;
	}

	async run(messages: ChatMessage[]): Promise<Response> {
		return this.env.AI.run(
			this.modelId as any,
			{ messages, max_tokens: 2048 },
			{ returnRawResponse: true },
		);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Serve static assets (Pages files) during local dev
		if (!url.pathname.startsWith("/api/")) {
			// Try to serve from ASSETS if available (local dev)
			if (env.ASSETS) {
				return env.ASSETS.fetch(request);
			}
			// In production, Pages serves the UI, so this should not be reached
			return new Response("Not found", { status: 404 });
		}

		// Conversations collection
		if (url.pathname === "/api/conversations" && request.method === "POST") {
			const id = env.CONVERSATIONS.newUniqueId();
			const stub = env.CONVERSATIONS.get(id);
			await stub.fetch(new Request(new URL("/initialize", request.url)));
			return Response.json({ id: id.toString() });
		}

		if (url.pathname === "/api/conversations" && request.method === "GET") {
			// Get metadata for a list of conversation IDs
			const idsParam = url.searchParams.get("ids");
			if (idsParam) {
				const ids = idsParam.split(",").filter(Boolean);
				const conversations = await Promise.all(
					ids.map(async (idStr) => {
						try {
							const id = env.CONVERSATIONS.idFromString(idStr);
							const stub = env.CONVERSATIONS.get(id);
							const metaUrl = new URL(request.url);
							metaUrl.pathname = "/meta";
							const metaResp = await stub.fetch(new Request(metaUrl.toString()));
							if (metaResp.ok) {
								return await metaResp.json();
							}
							return null;
						} catch (e) {
							console.error(`Error fetching meta for ${idStr}:`, e);
							return null;
						}
					}),
				);
				return Response.json({
					conversations: conversations.filter((c) => c !== null),
				});
			}
			return Response.json({ conversations: [] });
		}

		// Conversation-specific routes
		const convoMatch = url.pathname.match(/^\/api\/conversations\/(.+?)(?:\/(.*))?$/);
		if (convoMatch) {
			const convoId = convoMatch[1];
			const subpathPart = convoMatch[2] || "";
			const subpath = "/" + subpathPart;
			const id = env.CONVERSATIONS.idFromString(convoId);
			const stub = env.CONVERSATIONS.get(id);

			// Data/meta
			if (request.method === "GET" && subpath === "/data") {
				const doUrl = new URL(request.url);
				doUrl.pathname = "/data";
				return stub.fetch(new Request(doUrl.toString()));
			}
			if (request.method === "GET" && subpath === "/messages") {
				// Forward to DO with correct pathname, preserve query params
				const doUrl = new URL(request.url);
				doUrl.pathname = "/messages";
				return stub.fetch(new Request(doUrl.toString()));
			}
			if (request.method === "PUT" && subpath === "/preferences") {
				const doUrl = new URL(request.url);
				doUrl.pathname = "/preferences";
				return stub.fetch(
					new Request(doUrl.toString(), {
						method: "PUT",
						headers: request.headers,
						body: request.body,
					}),
				);
			}
			if (request.method === "PUT" && subpath === "/itinerary") {
				const doUrl = new URL(request.url);
				doUrl.pathname = "/itinerary";
				return stub.fetch(
					new Request(doUrl.toString(), {
						method: "PUT",
						headers: request.headers,
						body: request.body,
					}),
				);
			}
			if (request.method === "PUT" && subpath === "/title") {
				const doUrl = new URL(request.url);
				doUrl.pathname = "/title";
				return stub.fetch(
					new Request(doUrl.toString(), {
						method: "PUT",
						headers: request.headers,
						body: request.body,
					}),
				);
			}
			if (request.method === "DELETE" && subpath === "") {
				const doUrl = new URL(request.url);
				doUrl.pathname = "/delete";
				return stub.fetch(
					new Request(doUrl.toString(), {
						method: "DELETE",
					}),
				);
			}

			// Chat with Agent
			if (request.method === "POST" && subpath === "/chat") {
				try {
					const requestBody = (await request.json()) as {
						messages: ChatMessage[];
						location?: LocationContext;
					};

				// Fetch current context from DO; auto-initialize if missing
				const dataUrl = new URL(request.url);
				dataUrl.pathname = "/data";
				let dataResp = await stub.fetch(new Request(dataUrl.toString()));
				if (dataResp.status === 404) {
					const initUrl = new URL(request.url);
					initUrl.pathname = "/initialize";
					await stub.fetch(new Request(initUrl.toString(), { method: "POST" }));
					dataResp = await stub.fetch(new Request(dataUrl.toString()));
				}
				if (!dataResp.ok) {
					return new Response(
						JSON.stringify({ error: "Failed to fetch conversation data" }),
						{ status: dataResp.status, headers: { "Content-Type": "application/json" } },
					);
				}
				const data = (await dataResp.json()) as ConversationData;

					// Persist the user message
					const last = requestBody.messages[requestBody.messages.length - 1];
					if (last && last.role === "user") {
						const messageUrl = new URL(request.url);
						messageUrl.pathname = "/message";
						await stub.fetch(
							new Request(messageUrl.toString(), {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(last),
							}),
						);
					}

					// Build Agent with context
					const agent = new TravelAgent(env);
					const system = agent.buildSystemPrompt({
						preferences: data.preferences,
						itinerary: data.itinerary,
						location: requestBody.location,
					});

					// Get message history from DO for context
					const historyUrl = new URL(request.url);
					historyUrl.pathname = "/messages";
					historyUrl.search = "?limit=20";
					const historyResp = await stub.fetch(new Request(historyUrl.toString()));
					if (!historyResp.ok) {
						console.error("Failed to fetch message history:", historyResp.status);
						// Continue without history if fetch fails
					}
					const historyData = historyResp.ok
						? ((await historyResp.json()) as { messages: ChatMessage[] })
						: { messages: [] };
					const history = historyData.messages.filter((m) => m.role !== "system");

					// Build message array: system prompt + history + current user message
					const messages: ChatMessage[] = [
						{ role: "system", content: system },
						...history,
						...(last && last.role === "user" ? [last] : []),
					];

				// Run Agent and stream response
				const streamResponse = await agent.run(messages);
				
				// Use tee to persist assistant message while streaming to client
				const streamBody = streamResponse.body;
				if (!streamBody) {
					return streamResponse;
				}

				const [clientStream, persistStream] = streamBody.tee();

				// Persist assistant message in background
				ctx.waitUntil(
					(async () => {
						try {
							const reader = persistStream.getReader();
							const decoder = new TextDecoder();
							let assistantText = "";
							let buffer = "";

							while (true) {
								const { done, value } = await reader.read();
								if (done) break;

								buffer += decoder.decode(value, { stream: true });
								const lines = buffer.split("\n");
								buffer = lines.pop() || "";

								for (const line of lines) {
									const trimmed = line.trim();
									if (!trimmed) continue;
									try {
										const json = JSON.parse(trimmed);
										if (json.response) {
											assistantText += json.response;
										} else if (json.text) {
											assistantText += json.text;
										} else if (json.content) {
											assistantText += json.content;
										}
									} catch (e) {
										// Skip invalid JSON
									}
								}
							}

							// Persist assistant message
							if (assistantText.trim()) {
								const messageUrl = new URL(request.url);
								messageUrl.pathname = "/message";
								await stub.fetch(
									new Request(messageUrl.toString(), {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											role: "assistant",
											content: assistantText,
										}),
									}),
								);
							}
						} catch (error) {
							console.error("Error persisting assistant message:", error);
						}
					})(),
				);

				// Return client stream with proper headers
				const headers = new Headers(streamResponse.headers);
				return new Response(clientStream, { headers });
				} catch (error) {
					console.error("Chat error:", error);
					return new Response(
						JSON.stringify({ error: String(error) }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			}

			// If we matched a conversation but no sub-route matched, return 404
			return new Response(
				JSON.stringify({ error: "Not found", path: url.pathname, subpath }),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

export { ConversationDO };
