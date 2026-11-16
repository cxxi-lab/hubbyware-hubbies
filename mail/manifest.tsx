import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { Mail } from './pages/Mail'
import { MailSettings } from './settings/MailSettings'
import './hubby.css'

export const mailManifest: HubbyManifest = {
	id: 'mail',
	...describe(info),
	icon: faEnvelope,
	Settings: MailSettings,
	navItems: [],
	routes: [{ path: '/mail', Component: Mail, persistent: true }]
}
