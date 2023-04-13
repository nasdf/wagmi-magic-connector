import type { OAuthExtension } from '@magic-ext/oauth'
import type {
  InstanceWithExtensions,
  MagicSDKAdditionalConfiguration,
  SDKBase,
} from '@magic-sdk/provider';
import type { RPCProviderModule } from '@magic-sdk/provider/dist/types/modules/rpc-provider'
import { 
  Address,
  Chain,
  normalizeChainId,
  Connector,
} from '@wagmi/core'
import { providers } from 'ethers'
import { getAddress } from 'ethers/lib/utils.js'
import { LoginWithMagicLinkConfiguration, Magic } from 'magic-sdk'
import type { AbstractProvider } from 'web3-core'

type Provider = RPCProviderModule & AbstractProvider
type Options = MagicSDKAdditionalConfiguration<string, OAuthExtension[]> & { apiKey: string }

export class MagicConnector extends Connector<
  Provider,
  Options,
  providers.JsonRpcSigner
> {
  readonly id = 'magic'
  readonly name = 'Magic'
  readonly ready = true

  #magic?: InstanceWithExtensions<SDKBase, OAuthExtension[]>
  #login?: () => Promise<any>

  constructor(config: { chains?: Chain[]; options: Options }) {
    super(config)
    this.#createMagic()
  }

  loginWithMagicLink(config: LoginWithMagicLinkConfiguration) {
    this.#login = async () => await this.#magic!.auth.loginWithMagicLink(config)
  }
  
  async connect() {
    const provider = await this.getProvider()
    this.#setupListeners()

    const isAuthenticated = await this.isAuthorized()
    if (!isAuthenticated) {
      if (!this.#login) throw new Error('login method undefined')
      this.emit('message', { type: 'connecting' })
      await this.#login()
    }

    const id = await this.getChainId()
    const unsupported = this.isChainUnsupported(id)
    const account = await this.getAccount()

    return {
      account,
      chain: { id, unsupported },
      provider,
    }
  }

  async getAccount() {
    // @ts-ignore
    const provider = new providers.Web3Provider(await this.getProvider())
    const signer = provider.getSigner()
    const account = await signer.getAddress()
    return account as Address
  }

  async getChainId() {
    const network = this.options.network
    if (network === 'mainnet') return normalizeChainId(1)
    else if (network === 'goerli') return normalizeChainId(5)
    else if (network?.chainId) return normalizeChainId(network.chainId)
    throw new Error('chainId is undefined')
  }

  async getProvider() {
    return this.#magic!.rpcProvider as Provider
  }

  async getSigner() {
    // @ts-ignore
    const provider = new providers.Web3Provider(await this.getProvider())
    return provider.getSigner()
  }

  async isAuthorized() {
    try {
      return await this.#magic!.user.isLoggedIn()
    } catch {
      return false
    }
  }

  async disconnect() {
    try {
      await this.#magic!.user.logout()
    } finally {
      this.#removeListeners()
    }
  }

  protected onAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) this.emit('disconnect')
    else this.emit('change', { account: getAddress(accounts[0]!) })
  }

  protected onChainChanged = (chainId: number | string) => {
    const id = Number(chainId)
    const unsupported = this.isChainUnsupported(id)
    this.emit('change', { chain: { id, unsupported } })
  }

  protected onDisconnect = () => {
    this.emit('disconnect')
  }

  #createMagic() {
    if (typeof window === 'undefined') return
    this.#magic = new Magic(this.options.apiKey, this.options)
  }

  #setupListeners() {
    if (!this.#magic) return
    this.#removeListeners()
    this.#magic.rpcProvider.on('accountsChanged', this.onAccountsChanged)
    this.#magic.rpcProvider.on('chainChanged', this.onChainChanged)
    this.#magic.rpcProvider.on('disconnect', this.onDisconnect)
  }

  #removeListeners() {
    if (!this.#magic) return
    this.#magic.rpcProvider.removeListener('accountsChanged', this.onAccountsChanged)
    this.#magic.rpcProvider.removeListener('chainChanged', this.onChainChanged)
    this.#magic.rpcProvider.removeListener('disconnect', this.onDisconnect)
  }
}