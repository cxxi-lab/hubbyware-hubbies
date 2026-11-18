import { ai, type AiMessage } from '@cxxi-lab/hubbyware-sdk'
import { conversations, type ConversationDoc, type MessageDoc } from './data'

/**
 * What the model gets of a conversation (client docs/plan-ia-chat.md § 2.4, D4): its instructions, a
 * **summary** of what no longer fits, then the most recent messages. The engine's context is fixed
 * (8192 tokens): when the messages since the last summary outgrow its budget, the oldest of them are
 * summarized (with the summary before) by the model itself, the summary saved in the conversation
 * (encrypted, synced: another device continues it the same way) — the messages stay as they were.
 */

/** ~ characters per token (French or English text; code takes a bit more): an estimate, on the safe side */
const CHARS_PER_TOKEN = 3.2
const CONTEXT_TOKENS = 8_192
export const ANSWER_TOKENS = 2_048
/** what the transcript may take: the context, less the answer and the instructions */
const BUDGET = (CONTEXT_TOKENS - ANSWER_TOKENS - 700) * CHARS_PER_TOKEN
/** once summarized, the recent messages kept take at most this share: not a summary at every turn */
const KEEP_SHARE = 0.5
const SUMMARY_TOKENS = 600

export const SYSTEM = [
	'You are the assistant of Hubbyware, running on the user\'s own device: nothing they write leaves it.',
	'Answer in the user\'s language, clearly and briefly unless asked for more. Use Markdown when it helps (lists, code, tables).'
].join(' ')

const today = () => `Today is ${new Date().toDateString()}.`

/** A message as the model gets it: one too long for the budget alone is cut (the conversation keeps it whole). */
function forModel(m: Pick<MessageDoc, 'role' | 'content'>): AiMessage {
	const max = BUDGET * KEEP_SHARE
	const content = m.content.length > max ? `${m.content.slice(0, max / 2)}\n\n[… ${Math.round((m.content.length - max) / 1000)}k characters left out …]\n\n${m.content.slice(-max / 2)}` : m.content
	return { role: m.role === 'assistant' ? 'assistant' : 'user', content }
}

const size = (m: AiMessage) => m.content.length + 20

/** The messages since the last summary (the conversation's `summaryUpTo`). */
export function sinceSummary(conv: Pick<ConversationDoc, 'summaryUpTo'>, history: MessageDoc[]): MessageDoc[] {
	const chat = history.filter(m => m.role !== 'tool')
	const at = conv.summaryUpTo ? chat.findIndex(m => m.id === conv.summaryUpTo) : -1
	return at >= 0 ? chat.slice(at + 1) : chat
}

/** The model's summary of `messages`, carrying `before` on (chunked when they don't fit at once). */
async function summarize(model: string, before: string | null, messages: MessageDoc[]): Promise<string> {
	let summary = before
	let chunk: MessageDoc[] = []
	let chars = 0
	const flush = async () => {
		if (!chunk.length) return
		const lines = chunk.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${forModel(m).content}`).join('\n\n')
		const { content } = await ai.chat({
			model,
			maxTokens: SUMMARY_TOKENS,
			temperature: 0.2,
			messages: [
				{ role: 'system', content: 'You keep the memory of a conversation. Write a concise summary of it, in the language of the conversation, for yourself to continue it: the facts the user gave (names, numbers, preferences), what was decided or answered, what is still open. Plain sentences, no preamble, at most 250 words.' },
				{ role: 'user', content: `${summary ? `The summary so far:\n${summary}\n\nWhat was said next:\n` : ''}${lines}` }
			]
		})
		summary = content.trim() || summary
		chunk = []
		chars = 0
	}
	for (const m of messages) {
		const c = forModel(m).content.length
		if (chars + c > BUDGET * 0.8) await flush()
		chunk.push(m)
		chars += c
	}
	await flush()
	return summary ?? ''
}

/**
 * The transcript for the model's next answer — summarizing first (and saving it) when the messages
 * since the last summary no longer fit. Returns the conversation as it now is (its summary).
 */
export async function contextFor(conv: ConversationDoc, history: MessageDoc[], onSummarizing?: () => void): Promise<{ messages: AiMessage[], conversation: ConversationDoc }> {
	let current = conv
	let recent = sinceSummary(conv, history)
	const total = recent.reduce((n, m) => n + size(forModel(m)), 0) + (conv.summary?.length ?? 0)
	if (total > BUDGET && recent.length > 1) {
		// the newest messages that fit in KEEP_SHARE stay; everything before goes into the summary
		let kept = 0
		let cut = recent.length - 1
		for (let i = recent.length - 1; i >= 1; i--) {
			kept += size(forModel(recent[i]))
			if (kept > BUDGET * KEEP_SHARE) break
			cut = i
		}
		const older = recent.slice(0, cut)
		if (older.length) {
			onSummarizing?.()
			const summary = await summarize(conv.model, conv.summary ?? null, older)
			current = await conversations.update(conv.id, { summary, summaryUpTo: older.at(-1)!.id })
			recent = recent.slice(cut)
		}
	}
	const system: AiMessage = { role: 'system', content: `${SYSTEM} ${today()}${current.summary ? `\n\nEarlier in this conversation (a summary): ${current.summary}` : ''}` }
	// the most recent that fit (in case an estimate was off): newest first, the last one always
	const kept: AiMessage[] = []
	let chars = size(system)
	for (let i = recent.length - 1; i >= 0; i--) {
		const m = forModel(recent[i])
		chars += size(m)
		if (chars > BUDGET && kept.length > 0) break
		kept.unshift(m)
	}
	return { messages: [system, ...kept], conversation: current }
}
