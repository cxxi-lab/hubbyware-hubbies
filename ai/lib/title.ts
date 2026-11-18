import { ai } from '@cxxi-lab/hubbyware-sdk'

/** A short title for a conversation, from its first exchange (client docs/plan-ia-chat.md D3); null: none good. */
export async function proposeTitle(model: string, question: string, answer: string): Promise<string | null> {
	try {
		const { content } = await ai.chat({
			model,
			maxTokens: 24,
			temperature: 0.2,
			messages: [
				{ role: 'system', content: 'You name conversations. Reply with a title of 2 to 6 words, in the language of the conversation, without quotes, punctuation at the end, or any other text.' },
				{ role: 'user', content: `Question: ${question.slice(0, 1500)}\n\nAnswer: ${answer.slice(0, 1500)}` }
			]
		})
		const title = content.split('\n').map(l => l.trim()).find(Boolean)?.replace(/^["'«“#*\s]+|["'»”.*\s]+$/g, '') ?? ''
		return title.length >= 2 && title.length <= 80 ? title : null
	}
	catch {
		return null
	}
}
