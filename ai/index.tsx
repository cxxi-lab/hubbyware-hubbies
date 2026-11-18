import { faComments } from '@fortawesome/free-solid-svg-icons'
import { defineHubby } from '@cxxi-lab/hubbyware-sdk'
import { ChatApp } from './pages/ChatApp'
import './hubby.css'

/**
 * The AI hubby: a chat with AI models running on this device (client docs/plan-ia-chat.md), its
 * conversations encrypted and synced (read-only where no model runs). Runs isolated, on the SDK's
 * common API.
 */
export default defineHubby({
	navItems: [{ to: '/ai', label: 'Chat', icon: faComments, home: true }],
	routes: [{ path: '/ai', Component: ChatApp, prefix: true, persistent: true }]
})
