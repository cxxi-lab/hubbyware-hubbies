import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { describe, type ModuleManifest } from '@cxxi-lab/hub-sdk'
import info from './module.json'
import { Mail } from './pages/Mail'
import { MailSettings } from './settings/MailSettings'
import './module.css'

export const mailManifest: ModuleManifest = {
	id: 'mail',
	...describe(info),
	icon: faEnvelope,
	Settings: MailSettings,
	navItems: [],
	routes: [{ path: '/mail', Component: Mail, persistent: true }]
}
