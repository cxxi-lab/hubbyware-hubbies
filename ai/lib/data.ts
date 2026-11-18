import { collection, type HubbyDocument } from '@cxxi-lab/hubbyware-sdk'

/**
 * The conversations and their messages (client docs/plan-ia-chat.md § 2.2): two collections of the
 * hubby, on the device and synced, their texts encrypted (the server relays them without reading).
 */

/** local (a model on the device), else a device agent's id (claude-code, gemini-cli, codex…) */
export type Engine = string

export interface Conversation {
	title: string
	/** a name of hubby.json "ai" (or, phase 3, a model added by link) */
	model: string
	engine: Engine
	/** what its oldest messages said (phase 2) */
	summary?: string | null
	summaryUpTo?: string | null
	lastMessageAt: string
}

export interface Message {
	conversation: string
	role: 'user' | 'assistant' | 'tool'
	content: string
	toolCalls?: string | null
	model?: string | null
	engine?: Engine | null
	tokens?: number | null
	seconds?: number | null
}

export type ConversationDoc = Conversation & HubbyDocument
export type MessageDoc = Message & HubbyDocument

export const conversations = collection<Conversation>('conversation')
export const messages = collection<Message>('message')

export const listConversations = () => conversations.findAll({ sort: '-lastMessageAt' })
/** A conversation's messages in order: by time, then by id (uuidv7, growing even within a millisecond: two
 * messages written in the same one keep their order) */
export const messagesOf = (id: string) => messages.findAll({ filter: { conversation: id }, sort: '_createdAt' })
	.then(list => list.sort((a, b) => a._createdAt.localeCompare(b._createdAt) || a.id.localeCompare(b.id)))

export function newConversation(firstMessage: string, model: string, engine: Engine = 'local'): Promise<ConversationDoc> {
	const line = firstMessage.replace(/\s+/g, ' ').trim()
	return conversations.create({ title: line.length > 48 ? `${line.slice(0, 47)}…` : line || 'New chat', model, engine, lastMessageAt: new Date().toISOString() })
}

export async function addMessage(message: Message): Promise<MessageDoc> {
	const doc = await messages.create(message)
	await conversations.update(message.conversation, { lastMessageAt: doc._createdAt })
	return doc
}

/** A conversation and its messages (by batches: a long one has many). */
export async function removeConversation(id: string): Promise<void> {
	const all = await messagesOf(id)
	for (let i = 0; i < all.length; i += 100) {
		await messages.batch(all.slice(i, i + 100).map(m => ({ op: 'delete' as const, id: m.id })))
	}
	await conversations.remove(id)
}

// --- models added by link (client docs/plan-ia-chat.md § 2.6) ---

export interface AddedModel { name: string, label: string, spec: string }
export type AddedModelDoc = AddedModel & HubbyDocument

export const addedModels = collection<AddedModel>('model')
export const listAddedModels = () => addedModels.findAll({ sort: '_createdAt' })

/** the model of a new conversation, and the built-in one's label */
export const BUILT_IN = 'chat'
export const BUILT_IN_LABEL = 'Qwen3 (built in)'
