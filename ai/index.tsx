import { defineHubby } from '@cxxi-lab/hubbyware-sdk'
import './hubby.css'

/**
 * Local AI tools, driven by the AI engine (Window > Toggle AI Engine). Empty for now: the
 * Chatbot moved to the NSFW hubby. Runs isolated (client docs/plan-isolation.md), on the SDK's
 * common API. No server counterpart.
 */
function Empty() {
	return <p className="p-6 text-sm text-steel-400">No AI tool here yet.</p>
}

export default defineHubby({
	navItems: [],
	routes: [{ path: '/ai', Component: Empty }]
})
