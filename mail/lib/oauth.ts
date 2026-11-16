import { platform } from '@cxxi-lab/hubbyware-sdk'
import { finishOAuth, startOAuth, type MailAccount, type MailProvider } from '../api/mail'

/**
 * Connects a Gmail or Microsoft mailbox: the provider's consent opens in an app window, whose
 * redirect (caught before it loads) brings the code back to the server. null: the window was closed.
 */
export async function connectWithOAuth(provider: MailProvider): Promise<(MailAccount & { created: boolean }) | null> {
	const { url, redirectUri } = await startOAuth(provider)
	const back = await platform.authorizeOAuth(url, redirectUri)
	if (back === null) return null

	const params = new URL(back).searchParams
	const error = params.get('error')
	if (error) throw new Error(params.get('error_description') ?? (error === 'access_denied' ? 'Access was not granted' : error))
	const code = params.get('code')
	const state = params.get('state')
	if (!code || !state) throw new Error('The provider sent no code back')

	return finishOAuth(provider, code, state)
}
