import { faBriefcase, faFileInvoice, faGear, faUsers } from '@fortawesome/free-solid-svg-icons'
import { describe, type HubbyManifest } from '@cxxi-lab/hubbyware-sdk'
import info from './hubby.json'
import { BusinessInvoices } from './pages/BusinessInvoices'
import { BusinessClients } from './pages/BusinessClients'
import { BusinessSettings } from './pages/BusinessSettings'
import './hubby.css'

export const businessManifest: HubbyManifest = {
	id: 'business',
	...describe(info),
	icon: faBriefcase,
	navItems: [
		{ to: '/business/invoices', label: 'Invoices', icon: faFileInvoice },
		{ to: '/business/clients', label: 'Clients', icon: faUsers },
		{ to: '/business/settings', label: 'Settings', icon: faGear }
	],
	routes: [
		{ path: '/business/invoices', Component: BusinessInvoices, persistent: true },
		{ path: '/business/clients', Component: BusinessClients, persistent: true },
		{ path: '/business/settings', Component: BusinessSettings }
	]
}
