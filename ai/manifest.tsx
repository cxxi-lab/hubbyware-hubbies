import { faMicrochip } from '@fortawesome/free-solid-svg-icons'
import { describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import './hubby.css'

/**
 * Local AI tools, driven by the AI engine (Window > Toggle AI Engine). Empty for now:
 * the Chatbot moved to the Private (video) hubby. No server counterpart.
 */
export const aiManifest: HubbyManifest = {
	id: 'ai',
	...describe(info),
	icon: faMicrochip,
	navItems: [],
	routes: []
}
