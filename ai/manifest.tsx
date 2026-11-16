import { faMicrochip } from '@fortawesome/free-solid-svg-icons'
import { describe, type ModuleManifest } from '@cxxi-lab/hub-sdk'
import info from './module.json'
import './module.css'

/**
 * Local AI tools, driven by the AI engine (Window > Toggle AI Engine). Empty for now:
 * the Chatbot moved to the Private (video) module. No server counterpart.
 */
export const aiManifest: ModuleManifest = {
	id: 'ai',
	...describe(info),
	icon: faMicrochip,
	navItems: [],
	routes: []
}
