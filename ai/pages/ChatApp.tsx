import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ai, errorMessage, nav, platform, useAppState } from '@cxxi-lab/hubbyware-sdk'
import { ConversationList, groupOf } from '../components/ConversationList'
import { ChatView, type Streaming } from '../components/ChatView'
import { addedModels, addMessage, BUILT_IN, BUILT_IN_LABEL, conversations, listAddedModels, listConversations, messages, messagesOf, newConversation, removeConversation, type AddedModelDoc, type ConversationDoc, type MessageDoc } from '../lib/data'
import { ModelsDialog } from '../components/ModelsDialog'
import { AssistantDialog } from '../components/AssistantDialog'
import { ANSWER_TOKENS, contextFor } from '../lib/context'
import { proposeTitle } from '../lib/title'

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
	const modelOptions = [{ name: BUILT_IN, label: BUILT_IN_LABEL }, ...added.map(m => ({ name: m.name, label: m.label }))]
	const modelLabel = (name: string | null | undefined) => modelOptions.find(o => o.name === name)?.label ?? name ?? ''
	const currentModel = conversation?.model ?? nextModel
	const changeModel = (name: string) => {
		if (conversation) void conversations.update(conversation.id, { model: name }).then(reloadList)
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

	/** The model's answer to the conversation as it stands, saved once done (or stopped). */
	const answer = async (conv: ConversationDoc, upTo: MessageDoc[]) => {
		const controller = new AbortController()
		stop.current = controller
		setBusy(true)
		setError(null)
		setStreaming({ text: '' })
		let text = ''
		let keep = false
		const started = performance.now()
		try {
			// the messages that no longer fit summarized first (saved in the conversation)
			const { messages: context } = await contextFor(conv, upTo, () => setStreaming({ text: '', status: 'Summarizing the earlier messages…' }))
			setStreaming({ text: '' })
			const result = await ai.chat(
				{ model: conv.model, messages: context, maxTokens: ANSWER_TOKENS },
				{ signal: controller.signal, onDelta: delta => { text += delta; setStreaming({ text }) } }
			)
			// its time to the hundredth (the model's decimal): the engine's own generation time when it
			// says its speed (a cold start, a cool-down wait are not the model's)
			const tps = result.usage?.tokensPerSecond
			const tokens = result.usage?.completionTokens
			const seconds = Math.round((tps && tokens ? tokens / tps : (performance.now() - started) / 1000) * 100) / 100
			try {
				await addMessage({ conversation: conv.id, role: 'assistant', content: result.content, model: conv.model, engine: 'local', tokens: result.usage?.completionTokens ?? null, seconds })
			}
			catch (err) {
				// not saved: the answer stays on screen, with why
				keep = true
				setError(`This answer could not be saved: ${errorMessage(err)}`)
				return
			}
			// the first exchange: the model proposes a title (the first words stay if it doesn't)
			if (upTo.filter(m => m.role === 'user').length === 1) {
				const title = await proposeTitle(conv.model, upTo[0].content, result.content)
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
			const conv = conversation ?? await newConversation(text, nextModel)
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

	const regenerate = async () => {
		const last = history.at(-1)
		if (!conversation || last?.role !== 'assistant') return
		await messages.remove(last.id)
		const upTo = history.slice(0, -1)
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
