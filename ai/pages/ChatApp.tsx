import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ai, errorMessage, nav, platform, useAppState, type AgentEngine, type AiMessage } from '@cxxi-lab/hubbyware-sdk'
import { ConversationList, groupOf } from '../components/ConversationList'
import { ChatView, type Streaming } from '../components/ChatView'
import { addedModels, addMessage, BUILT_IN, BUILT_IN_LABEL, conversations, listAddedModels, listConversations, messages, messagesOf, newConversation, removeConversation, type AddedModelDoc, type ConversationDoc, type MessageDoc } from '../lib/data'
import { ModelsDialog } from '../components/ModelsDialog'
import { AssistantDialog } from '../components/AssistantDialog'
import { ANSWER_TOKENS, contextFor } from '../lib/context'
import { proposeTitle } from '../lib/title'
import { loadToolset, MAX_ROUNDS, resultText, transcriptOf, type ToolTrace } from '../lib/agent'

/**
 * The AI hubby's chat (client docs/plan-ia-chat.md, phase 1): its conversations in the app's column
 * (its live navigation, by date, New chat, a search; on a phone, where the bottom bar can't hold them,
 * in this page: the list or the conversation), the one open at /ai/c/<id>; its answers from a model on this
 * device (`ai.chat`), saved once done — an answer stopped midway is kept as it is.
 */


export function ChatApp() {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	// the app's phone layout (not this frame's width: the app's column narrows it)
	const { phone } = useAppState()
	const readOnly = !platform.capabilities.localAi
	const active = /^\/ai\/c\/([^/]+)/.exec(pathname)?.[1] ?? null

	const [list, setList] = useState<ConversationDoc[] | null>(null)
	const [history, setHistory] = useState<MessageDoc[]>([])
	const [streaming, setStreaming] = useState<Streaming | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const stop = useRef<AbortController | null>(null)
	const activeRef = useRef(active)
	activeRef.current = active

	const reloadList = useCallback(() => listConversations().then(setList, err => setError(errorMessage(err))), [])
	const reloadHistory = useCallback(async (id: string | null) => {
		if (!id) { setHistory([]); return }
		const all = await messagesOf(id)
		if (activeRef.current === id) setHistory(all)
	}, [])
	useEffect(() => { void reloadList(); return conversations.onChange(() => void reloadList()) }, [reloadList])
	useEffect(() => {
		setError(null)
		// an answer kept on screen (not saved) belongs to the conversation it was for
		if (!stop.current) setStreaming(null)
		void reloadHistory(active)
	}, [active, reloadHistory])
	useEffect(() => messages.onChange(() => void reloadHistory(activeRef.current)), [reloadHistory])

	const conversation = list?.find(c => c.id === active) ?? null

	// the models added by link (synced), handed to this device to offer them (allowed, downloaded as the others)
	const [added, setAdded] = useState<AddedModelDoc[]>([])
	const [modelsOpen, setModelsOpen] = useState(false)
	const [assistantOpen, setAssistantOpen] = useState(false)
	const [nextModel, setNextModel] = useState(BUILT_IN)
	// the device's AI agents that may answer instead of a local model (desktop: Claude Code, ACP agents)
	const [engines, setEngines] = useState<AgentEngine[]>([])
	useEffect(() => { void ai.agent.engines().then(list => setEngines(list.filter(e => e.available)), () => {}) }, [])
	useEffect(() => {
		const reload = () => void listAddedModels().then(list => {
			setAdded(list)
			if (platform.capabilities.localAi) {
				void ai.models.set(list.flatMap(m => {
					try { return [{ name: m.name, label: m.label, ...(JSON.parse(m.spec) as { repo: string, revision: string, files: Array<{ path: string, sha256: string, size: number }>, requires: { vram: number, ram: number } }) }] }
					catch { return [] }
				})).catch(err => setError(errorMessage(err)))
			}
		})
		reload()
		return addedModels.onChange(reload)
	}, [])
	// an agent's option: agent:<its id>
	const modelOptions = [
		{ name: BUILT_IN, label: BUILT_IN_LABEL },
		...added.map(m => ({ name: m.name, label: m.label })),
		...engines.map(e => ({ name: `agent:${e.id}`, label: `${e.label}${e.signedIn === false ? ' (not signed in)' : ''}` }))
	]
	const engineLabel = (id: string) => engines.find(e => e.id === id)?.label ?? id
	// an answer's model: a local model, or a device agent (by its id)
	const modelLabel = (name: string | null | undefined) => name?.startsWith('agent:') ? engineLabel(name.slice(6)) : modelOptions.find(o => o.name === name)?.label ?? engines.find(e => e.id === name)?.label ?? name ?? ''
	const currentModel = conversation ? (conversation.engine && conversation.engine !== 'local' ? `agent:${conversation.engine}` : conversation.model) : nextModel
	/** a local model, or a device agent (its engine): the conversation goes on with it (replayed to it) */
	const changeModel = (name: string) => {
		const engine = name.startsWith('agent:') ? name.slice(6) : 'local'
		if (conversation) void conversations.update(conversation.id, engine === 'local' ? { model: name, engine } : { engine }).then(reloadList)
		else setNextModel(name)
	}

	// the conversations in the app's column (not on a phone: they are in this page there)
	useEffect(() => {
		if (phone) { nav.clearItems(); return }
		nav.setItems((list ?? []).map(c => ({ path: `/c/${c.id}`, label: c.title, section: groupOf(c.lastMessageAt) })), {
			action: { label: 'New chat', onClick: () => navigate('/ai') },
			search: 'Search'
		})
	}, [list, phone])

	/**
	 * The model's answer to the conversation as it stands, saved once done (or stopped). With hubbies
	 * opened to the assistant (client docs/plan-ia-agent.md, phase 2), the model may call their tools
	 * first: each call run by the app (asking the user before a change or a send), it and its result
	 * saved (the conversation's trace), the model going on with the results — at most MAX_ROUNDS rounds.
	 */
	/**
	 * A device agent's answer (client docs/plan-ia-agent.md, phase 4): the new message to the agent
	 * (with the conversation so far when it has no session of it here), its text as it comes, and
	 * Hubbyware's record of every call it made through the MCP server (kept: the trace), the tools of
	 * its own it tried (refused: kept too).
	 */
	const agentAnswer = async (conv: ConversationDoc, upTo: MessageDoc[]) => {
		const controller = new AbortController()
		stop.current = controller
		setBusy(true)
		setError(null)
		setStreaming({ text: '', status: `${engineLabel(conv.engine)} is starting…` })
		let text = ''
		let keep = false
		const labels = new Map((await ai.agent.tools().catch(() => ({ tools: [] }))).tools.map(t => [t.hubby, t.hubbyLabel]))
		const saving: Promise<unknown>[] = []
		try {
			const last = upTo.at(-1)!
			const result = await ai.agent.run({ engine: conv.engine, conversation: conv.id, text: last.content, transcript: transcriptOf(upTo.slice(0, -1), conv.summary) }, {
				signal: controller.signal,
				onDelta: delta => { text += delta; setStreaming({ text }) },
				onStatus: (kind, what) => { if (kind === 'tool' && !text) setStreaming({ text: '', status: 'Using a tool…' }); void what },
				onCall: call => {
					const trace: ToolTrace = { id: crypto.randomUUID(), name: call.tool, hubby: call.hubby, hubbyLabel: labels.get(call.hubby) ?? call.hubby, method: call.method, effect: call.effect, confirmation: call.confirmation, ok: call.ok, arguments: call.input }
					saving.push(addMessage({ conversation: conv.id, role: 'tool', content: resultText(call), toolCalls: JSON.stringify(trace) }).then(() => reloadHistory(conv.id)))
				},
				onDenied: tool => {
					const trace: ToolTrace = { id: crypto.randomUUID(), name: tool, hubby: '', hubbyLabel: engineLabel(conv.engine), method: tool, effect: 'outward', confirmation: 'denied', ok: false, arguments: {} }
					saving.push(addMessage({ conversation: conv.id, role: 'tool', content: 'Refused: not one of Hubbyware\'s tools', toolCalls: JSON.stringify(trace) }).then(() => reloadHistory(conv.id)))
				}
			})
			await Promise.all(saving)
			// no speed shown: its time includes the tools and the user's go-aheads
			try {
				if (result.content || !controller.signal.aborted) await addMessage({ conversation: conv.id, role: 'assistant', content: result.content || text, model: conv.engine, engine: conv.engine, tokens: result.usage?.outputTokens ?? null, seconds: null })
			}
			catch (err) {
				keep = true
				setError(`This answer could not be saved: ${errorMessage(err)}`)
			}
		}
		catch (err) {
			await Promise.all(saving).catch(() => {})
			if (controller.signal.aborted) {
				if (text.trim()) await addMessage({ conversation: conv.id, role: 'assistant', content: text, model: conv.engine, engine: conv.engine })
			}
			else setError(errorMessage(err))
		}
		finally {
			if (!keep) setStreaming(null)
			setBusy(false)
			stop.current = null
			await reloadHistory(conv.id)
		}
	}

	const answer = async (conv: ConversationDoc, upTo: MessageDoc[]) => {
		if (conv.engine && conv.engine !== 'local') return agentAnswer(conv, upTo)
		const controller = new AbortController()
		stop.current = controller
		setBusy(true)
		setError(null)
		setStreaming({ text: '' })
		let text = ''
		let keep = false
		const started = performance.now()
		try {
			// the hubbies' tools (none opened: a plain chat); unreachable, the chat goes on without them
			const toolset = await loadToolset().catch(() => null)
			// the messages that no longer fit summarized first (saved in the conversation)
			const { messages: context } = await contextFor(conv, upTo, () => setStreaming({ text: '', status: 'Summarizing the earlier messages…' }),
				toolset ? { instructions: toolset.instructions, chars: JSON.stringify(toolset.specs).length } : undefined)
			setStreaming({ text: '' })
			const turn: AiMessage[] = []
			let tokens = 0
			let genSeconds = 0
			for (let round = 0; ; round++) {
				text = ''
				const offerTools = toolset && round < MAX_ROUNDS
				const result = await ai.chat(
					{ model: conv.model, messages: [...context, ...turn], maxTokens: ANSWER_TOKENS, ...(offerTools ? { tools: toolset.specs } : {}) },
					{ signal: controller.signal, onDelta: delta => { text += delta; setStreaming({ text }) } }
				)
				const tps = result.usage?.tokensPerSecond
				const n = result.usage?.completionTokens ?? 0
				tokens += n
				genSeconds += tps && n ? n / tps : 0
				if (!offerTools || !result.toolCalls.length) {
					text = result.content
					break
				}
				// the model calls tools: its message (the calls) kept, each call run, its result kept
				const calls = result.toolCalls
				await addMessage({ conversation: conv.id, role: 'assistant', content: result.content, toolCalls: JSON.stringify(calls.map(c => ({ id: c.id, name: c.name, arguments: c.arguments }))), model: conv.model, engine: 'local' })
				turn.push({ role: 'assistant', content: result.content, tool_calls: calls.map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) } })) })
				for (const call of calls) {
					if (controller.signal.aborted) throw new DOMException('stopped', 'AbortError')
					const tool = toolset.tools.find(t => t.name === call.name)
					setStreaming({ text: '', status: tool ? `Using ${tool.hubbyLabel}…` : 'Using a tool…' })
					const r = call.error
						? { tool: call.name, hubby: tool?.hubby ?? '', method: tool?.method ?? call.name, effect: tool?.effect ?? 'read', confirmation: 'none' as const, ok: false, error: `its arguments are not valid JSON (${call.error})` }
						: await ai.agent.call(conv.id, call.name, call.arguments ?? {})
					const content = resultText(r)
					const trace: ToolTrace = { id: call.id, name: call.name, hubby: r.hubby, hubbyLabel: tool?.hubbyLabel ?? r.hubby, method: r.method, effect: r.effect, confirmation: r.confirmation, ok: r.ok, arguments: call.arguments ?? {} }
					await addMessage({ conversation: conv.id, role: 'tool', content, toolCalls: JSON.stringify(trace) })
					turn.push({ role: 'tool', tool_call_id: call.id, content })
				}
				await reloadHistory(conv.id)
				setStreaming({ text: '' })
			}
			// its time to the hundredth (the model's decimal): the engine's own generation time when it
			// says its speed (a cold start, a cool-down wait are not the model's)
			const seconds = Math.round((genSeconds || (performance.now() - started) / 1000) * 100) / 100
			try {
				await addMessage({ conversation: conv.id, role: 'assistant', content: text, model: conv.model, engine: 'local', tokens: tokens || null, seconds })
			}
			catch (err) {
				// not saved: the answer stays on screen, with why
				keep = true
				setError(`This answer could not be saved: ${errorMessage(err)}`)
				return
			}
			// the first exchange: the model proposes a title (the first words stay if it doesn't)
			if (upTo.filter(m => m.role === 'user').length === 1) {
				const title = await proposeTitle(conv.model, upTo[0].content, text)
				if (title) await conversations.update(conv.id, { title })
			}
		}
		catch (err) {
			if (controller.signal.aborted) {
				if (text.trim()) await addMessage({ conversation: conv.id, role: 'assistant', content: text, model: conv.model, engine: 'local' })
			}
			else setError(errorMessage(err))
		}
		finally {
			if (!keep) setStreaming(null)
			setBusy(false)
			stop.current = null
			await reloadHistory(conv.id)
		}
	}

	const send = async (text: string) => {
		try {
			const conv = conversation ?? (nextModel.startsWith('agent:') ? await newConversation(text, BUILT_IN, nextModel.slice(6)) : await newConversation(text, nextModel))
			if (!conversation) {
				await reloadList()
				navigate(`/ai/c/${conv.id}`)
			}
			const mine = await addMessage({ conversation: conv.id, role: 'user', content: text })
			const upTo = [...(conversation ? history : []), mine]
			setHistory(upTo)
			await answer(conv, upTo)
		}
		catch (err) {
			setError(errorMessage(err))
		}
	}

	// the last answer again: it and the tool calls it made (back to the user's message)
	const regenerate = async () => {
		const last = history.at(-1)
		if (!conversation || last?.role !== 'assistant') return
		const from = history.map(m => m.role).lastIndexOf('user') + 1
		const gone = history.slice(from)
		await messages.batch(gone.map(m => ({ op: 'delete' as const, id: m.id })))
		const upTo = history.slice(0, from)
		setHistory(upTo)
		await answer(conversation, upTo)
	}

	const remove = async (id: string) => {
		await removeConversation(id)
		if (id === active) navigate('/ai')
		await reloadList()
	}

	const listView = (
		<ConversationList
			items={list}
			active={active}
			onOpen={id => navigate(`/ai/c/${id}`)}
			onNew={() => navigate(phone ? '/ai/new' : '/ai')}
			onRename={(id, title) => void conversations.update(id, { title }).then(reloadList)}
			onRemove={id => void remove(id)}
		/>
	)
	const chatView = (
		<ChatView
			title={conversation?.title ?? null}
			summary={conversation?.summary ? { text: conversation.summary, upTo: conversation.summaryUpTo ?? null } : null}
			history={history}
			streaming={streaming}
			busy={busy}
			error={error}
			readOnly={readOnly}
			onSend={text => void send(text)}
			onStop={() => stop.current?.abort()}
			onRegenerate={() => void regenerate()}
			onBack={phone ? () => navigate('/ai') : undefined}
			onRename={conversation ? (title => void conversations.update(conversation.id, { title }).then(reloadList)) : undefined}
			onRemove={conversation ? (() => void remove(conversation.id)) : undefined}
			models={modelOptions}
			model={currentModel}
			modelLabel={modelLabel}
			onModel={readOnly ? undefined : changeModel}
			onManageModels={readOnly ? undefined : () => setModelsOpen(true)}
			onAssistant={() => setAssistantOpen(true)}
		/>
	)
	const dialog = <>{modelsOpen && <ModelsDialog added={added} onClose={() => setModelsOpen(false)} />}{assistantOpen && <AssistantDialog onClose={() => setAssistantOpen(false)} />}</>

	if (phone) {
		// the frame's viewport is its area: the page fills it, the composer at the bottom
		return <div className="h-dvh min-h-0 flex flex-col">{active || pathname === '/ai/new' ? chatView : <div className="flex-1 min-h-0 p-4">{listView}</div>}{dialog}</div>
	}
	return <div className="h-dvh min-h-0 flex">{chatView}{dialog}</div>
}
