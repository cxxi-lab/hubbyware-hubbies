import type { AiMessage } from '@cxxi-lab/hubbyware-sdk'
import type { ConversationDoc, MessageDoc } from './data'

/**
 * What the model gets of a conversation (client docs/plan-ia-chat.md § 2.4): its instructions, the
 * summary of the oldest messages when there is one (phase 2), then the most recent messages that fit
 * the context's budget — the whole transcript replayed on whichever device and engine continues it.
 */

/** the engine's context is 8192 tokens: ~5000 for the transcript, the rest for the answer */
const BUDGET_CHARS = 5_000 * 3.5

export const SYSTEM = [
	'You are the assistant of Hubbyware, running on the user\'s own device: nothing they write leaves it.',
	'Answer in the user\'s language, clearly and briefly unless asked for more. Use Markdown when it helps (lists, code, tables).',
	`Today is ${new Date().toDateString()}.`
].join(' ')

export function transcript(conversation: Pick<ConversationDoc, 'summary'> | null, history: Pick<MessageDoc, 'role' | 'content'>[]): AiMessage[] {
	const system: AiMessage = { role: 'system', content: conversation?.summary ? `${SYSTEM}\n\nEarlier in this conversation: ${conversation.summary}` : SYSTEM }
	const kept: AiMessage[] = []
	let chars = system.content.length
	for (let i = history.length - 1; i >= 0; i--) {
		const m = history[i]
		if (m.role === 'tool') continue
		chars += m.content.length
		if (chars > BUDGET_CHARS && kept.length > 0) break
		kept.unshift({ role: m.role, content: m.content })
	}
	return [system, ...kept]
}
