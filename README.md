# wagmi-magic-connector

Wagmi connector for Magic Auth

## Install

```bash
npm install @nasdf/wagmi-magic-connector
yarn add @nasdf/wagmi-magic-connector
pnpm add @nasdf/wagmi-magic-connector
```

## Usage

Ethereum Mainnet

```javascript
import { MagicConnector } from '@nasdf/wagmi-magic-connector'

const connector = new MagicConnector({
  options: {
    apiKey: 'YOUR_PUBLISHABLE_API_KEY',
    network: 'mainnet', 
  }
})
```

Custom Nodes

```javascript
import { MagicConnector } from '@nasdf/wagmi-magic-connector'

const network = {
  rpcUrl: 'http://127.0.0.1:7545', // Your own node URL
  chainId: 1011, // Your own node's chainId
}

const connector = new MagicConnector({
  options: {
    apiKey: 'YOUR_PUBLISHABLE_API_KEY',
    network,
  }
})
```

Connect with Magic Link

```javascript
import { useState } from 'react'
import { useConnect } from 'wagmi'

export default function SignIn() {
  const [email, setEmail] = useState('')

  const { connect, connectors } = useConnect()
  const connector = connectors.find(c => c.id === 'magic')

  const onSubmit = (event) => {
    event.preventDefault()
    connector.loginWithMagicLink({ email, showUI: true })
    connect({ connector })
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Email</label>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit">Send Magic Link</button>
    </form>
  )
}
```