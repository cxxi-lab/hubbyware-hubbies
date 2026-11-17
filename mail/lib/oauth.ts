import { oauth } from '@cxxi-lab/hubbyware-sdk'
import { addConnectedAccount, type MailAccount, type MailProvider, type ProviderInfo } from '../api/mail'

const PROVIDER_OF: Partial<Record<MailProvider, string>> = { gmail: 'google', microsoft: 'microsoft' }

/**
 * Connects a Gmail or Microsoft mailbox: the account's connection at the provider (the SDK's
 * oauth, for the mail scopes this hubby declares; its consent opens in the browser), then the
 * mailbox logging in with it. `account`: one already there, connected again. null: given up.
 */
export async function connectWithOAuth(provider: MailProvider, info: ProviderInfo | undefined, account: MailAccount | null, signal?: AbortSignal): Promise<(MailAccount & { created: boolean }) | null> {
	const oauthProvider = info?.oauthProvider ?? PROVIDER_OF[provider]
	if (!oauthProvider) throw new Error('This provider logs in with a password')
	const connection = await oauth.connect(oauthProvider, { connection: account?.connection ?? undefined, signal })
	if (connection === null) return null

	return addConnectedAccount(connection.id)
}
