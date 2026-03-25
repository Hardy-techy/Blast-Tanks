# Somnia Reactivity

{% hint style="warning" %}
**Reactivity is currently only available on TESTNET**
{% endhint %}

Somnia Reactivity is a native toolkit for building event-driven dApps on the Somnia chain. Events and blockchain state is pushed directly to your TypeScript or Solidity apps in one atomic notification without polling.

#### Key Benefits

* **Real-Time Efficiency**: Notifications include events + state from the same block, slashing RPC calls and latency.
* **Cross-Environment**: Seamless for off-chain (WebSocket) and on-chain (EVM invocations).
* **Scalable Subscriptions**: Customizable for filters, guarantees, and coalescing to fit your app's needs.

TL;DR: Build reactive dApps that respond instantly to on-chain activity, reducing complexity and costs vs. traditional EVM setups.



# What is Reactivity?

Reactivity is Somnia's event-driven paradigm for dApps. It pushes notifications—combining emitted events and related blockchain state—to subscribers in real-time, enabling "reactive" logic without polling.

{% hint style="warning" %}
**Reactivity is currently only available on TESTNET**
{% endhint %}

#### Core Concepts

* **Events**: Triggers from smart contracts (e.g., Transfer, Approval).
* **State**: View calls for contract data fetched at the event's block height.
* **Push Delivery**: Chain validators / nodes handle notifications, invoking handlers or WebSocket callbacks directly.
* **Subscribers**: Off-chain apps (TypeScript) or on-chain contracts (Solidity).

This shifts dApps from reactive querying to proactive responses, like a pub/sub system baked into the blockchain.



# Quickstart

{% hint style="warning" %}
**Reactivity is currently only available on TESTNET**
{% endhint %}

### Off-chain (TypeScript)

#### 📦 SDK Installation

```bash
npm i @somnia-chain/reactivity
```

#### 🔌 Plugging into the SDK

You'll need `viem` installed for the public and or wallet client. Install it with `npm i viem`.

```typescript
import { createPublicClient, createWalletClient, http, defineChain } from 'viem'
import { SDK } from '@somnia-chain/reactivity'

// Example: Public client (required for reading data)
const chain = defineChain() // see viem docs for defining a chain
const publicClient = createPublicClient({
  chain, 
  transport: http(),
})

// Optional: Wallet client for writes
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(),
})

const sdk = new SDK({
  public: publicClient,
  wallet: walletClient, // Omit if not executing transactions on-chain
})
```

#### 📡 Activating Websocket Reactivity Subscriptions

Use WebSocket subscriptions for real-time updates to contract event and state updates atomically. Define params and subscribe — the SDK handles the rest via WebSockets.

```typescript
import { SDK, SubscriptionInitParams, SubscriptionCallback } from '@somnia-chain/reactivity'

const initParams: SubscriptionInitParams = {
  ethCalls: [], // State to read when events are emitted
  onData: (data: SubscriptionCallback) => console.log('Received:', data),
}

const subscription = await sdk.subscribe(initParams)
```

### On-chain (Solidity handlers)

Developers can build Solidity smart contracts that get invoked when other contracts emit events—allowing smart contracts to "react" to what's happening on-chain.

In order to achieve this, we need two things:

1. A Somnia event handler smart contract (standard Solidity syntax).
2. A valid subscription with funds to pay for Solidity handler invocations. Creators of on-chain subscriptions are required to hold minimum balances (currently 32 SOM) that pay for handler invocations executed by validators.

#### Creating the Handler Smart Contract

Very basic contract with the `@somnia-chain/reactivity-contracts` npm package installed

```solidity
pragma solidity ^0.8.20;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract ExampleEventHandler is SomniaEventHandler {

    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Execute your logic here
        // Be careful about emitting events to avoid infinite loops
    }

}
```

Once the handler is complete, deploy it using Foundry or Hardhat, and note the address — this will be required for creating a subscription.

#### Setting Up an On-Chain Subscription (Using the SDK)

The following uses the TypeScript SDK to create and pay for a subscription that will invoke a handler contract for events emitted by other smart contracts. Another approach would be for the subscribing smart contract to directly hold the required SOM balance and have the logic for creating the subscription baked into one place, but that may not always be optimal.

```typescript
import { SDK } from '@somnia-chain/reactivity';
import { parseGwei } from 'viem';

// Initialize the SDK
const sdk = new SDK({
  public: publicClient,
  wallet: walletClient,
})

// Create a Solidity subscription
// This is an example of a wildcard subscription to all events
// We do not need to supply SOM—the chain ensures min balance
await sdk.createSoliditySubscription({
  handlerContractAddress: '0x123...',
  priorityFeePerGas: parseGwei('2'),   // 2 gwei — minimum recommended for validators to process
  maxFeePerGas: parseGwei('10'),       // 10 gwei — max you're willing to pay (base + priority)
  gasLimit: 2_000_000n,                // Minimum recommended for state changes, increase for complex logic
  isGuaranteed: true,
  isCoalesced: false,
});
```



# Subscriptions: The Core Primitive

Subscriptions are configurable listeners that define what events to watch and how to deliver notifications. They're the foundation of reactivity—create one, and the chain does the rest.

#### Key Features

* **Filters**: Wildcard (\*) for all events, or specify emitters, topics.
* **On-chain**
  * **Costs**: Minimum 32 SOM balance to cover handler invocation costs on-chain (validators execute handlers) + small amount of gas (\~21K) to create each subscription
  * **Options**:
    * isGuaranteed: Eventual delivery with some block inclusion distance (true/false).
    * isCoalesced: Batch multiple events into one notification within a block.
    * Handler Gas params: priorityFeePerGas, maxFeePerGas, gasLimit
* **Off-chain**&#x20;
  * **Costs**: Cost of running the Somnia node or paying an RPC provider



# Push vs Pull: An Architectural Shift

Traditional EVM dApps "pull" data via polling (e.g., repeated getLogs or state rpc queries), leading to inefficiency and high rpc costs. Somnia Reactivity's "push" model notifies you proactively, transforming app architecture.

#### Highlights

| Aspect     | Pull (Traditional)                 | Push (Somnia Reactivity)          |
| ---------- | ---------------------------------- | --------------------------------- |
| Data Fetch | Poll RPCs periodically             | Passive notifications             |
| Latency    | Seconds to minutes (poll interval) | Near-instant (block time)         |
| RPC Calls  | High (loops, retries)              | Minimal (one sub setup)           |
| Complexity | Manage loops, error handling       | Simple callback/handler           |
| Use Cases  | Basic event listening              | Real-time reactions, auto-updates |

#### Why It Matters

* **Simplified Front-Ends**: No more `setInterval` for balances—push updates UIs directly.
* **Efficient Indexers**: Push to DBs instead of scanning blocks.
* **Cost Savings**: Avoid redundant queries.

Let the chain push changes to you and build realtime blockchain applications




# System Events

There are two events that are generated by the system, this is represented in Solidity as:

```solidity
event BlockTick(uint64 indexed blockNumber);
event BlockTick(uint64 indexed epochNumber, uint64 indexed blockNumber);
event Schedule(uint256 indexed timestampMillis);
```

You can subscribe to those events as any other. The system will generate those events for every block and match with any subscriptions.&#x20;

{% hint style="info" %}
Remember to set the `emitter` field to `SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS`. This will make sure that your handler will only respond to system events.
{% endhint %}

### Block Tick Event

If `blockNumber` is provided then this event will trigger at the specific block. Otherwise this will be triggered at every block, \~10 times per second.

This example will tick at every single block:

```solidity
ISomniaReactivityPrecompile.SubscriptionData
    memory subscriptionData = ISomniaReactivityPrecompile
        .SubscriptionData({
            eventTopics: [BlockTick.selector, bytes32(0), bytes32(0), bytes32(0)],
            emitter: SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS,
            handlerContractAddress: address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            /*...*/
    });
```

### Epoch Tick Event

If `epochNumber` is provided then this event will trigger at the beginning of the specific epoch. Otherwise this will be triggered at every epoch, roughly every \~5 minutes.

This example will tick at every single epoch:

```solidity
ISomniaReactivityPrecompile.SubscriptionData
    memory subscriptionData = ISomniaReactivityPrecompile
        .SubscriptionData({
            eventTopics: [EpochTick.selector, bytes32(0), bytes32(0), bytes32(0)],
            emitter: SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS,
            handlerContractAddress: address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            /*...*/
    });
```

### Schedule Event

This event is useful for scheduling actions in the future. Few things to remember:

* The provided timestamp must be in the future, minimum is next second from the current block
* The subscription to `Schedule` is one-off and will be deleted after triggering
* The timestamp is expressed in milliseconds (see <https://currentmillis.com/> for handy calculations)

his example will tick on Nov 11 2026 11:11:11.011 :

```solidity
ISomniaReactivityPrecompile.SubscriptionData
    memory subscriptionData = ISomniaReactivityPrecompile
        .SubscriptionData({
            eventTopics: [Schedule.selector, 1794395471011, bytes32(0), bytes32(0)],
            emitter: SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS,
            handlerContractAddress: address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            /*...*/
    });
```



# State Consistency Guarantees

Somnia ensures notifications deliver events and state that are consistent—sourced from the exact same block. This eliminates race conditions common in pull models.

#### How It Works

* **Atomic Delivery**: Event + state (via ETH calls) processed in one validator-executed bundle.
* **Guarantees**:
  * Non-coalesced: One notification per event.
  * Coalesced: Batched, but state reflects the latest in the batch.

#### Example Impact

In a DeFi app, a "Transfer" event pushes the new balance immediately—no extra balanceOf call needed.

This makes dApps more reliable and easier to reason about.



# No, this is not like regular EVM event subscriptions

Think event subscriptions are old news? On Ethereum or other EVM chains, they're just events, no state, and no on-chain reactions. Somnia's push subscriptions deliver state along side event data, something other EVMs cannot offer.

#### Chain Comparison

* **Other Chains**: `eth_subscribe` gives events only—you still pull state separately, risking inconsistency.
* **Somnia**: Pushes event + state atomically; invokes Solidity handlers directly.

#### Code Comparison

**Ethereum (Pull)**:

```javascript
web3.eth.subscribe('logs', { address: '0x...' }, (err, log) => {
  // Now pull state manually
  contract.methods.balanceOf(...).call();
});
```

**Somnia (Push)**:

```typescript
sdk.subscribe({ ethCalls: ['balanceOf'], onData: (data) => {
  // Event + state delivered with `data`
});
```


# Tooling

{% hint style="warning" %}
**Somnia Reactivity is currently only available on TESTNET**
{% endhint %}

Dive into the following sections to get a better understanding of the Somnia Reactivity tooling

{% content-ref url="tooling/comparison" %}
[comparison](https://docs.somnia.network/developer/reactivity/tooling/comparison)
{% endcontent-ref %}

{% content-ref url="tooling/off-chain-typescript" %}
[off-chain-typescript](https://docs.somnia.network/developer/reactivity/tooling/off-chain-typescript)
{% endcontent-ref %}

{% content-ref url="tooling/on-chain-solidity" %}
[on-chain-solidity](https://docs.somnia.network/developer/reactivity/tooling/on-chain-solidity)
{% endcontent-ref %}

{% content-ref url="tooling/subscription-management" %}
[subscription-management](https://docs.somnia.network/developer/reactivity/tooling/subscription-management)
{% endcontent-ref %}




# Comparison

Somnia Reactivity supports two subscription modes: off-chain (via WebSocket in TypeScript) for flexible, external app integration, and on-chain (via Solidity handlers) for automated, trustless blockchain reactions. Choose based on your dApp's needs—off-chain for UIs/backends, on-chain for DeFi/automation.

#### Comparison Table

| Aspect                | Off-Chain (WebSocket/TypeScript)                           | On-Chain (Solidity/EVM)                                                                        |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Delivery Mechanism    | WebSocket push to your app/server                          | Direct EVM invocation of handler contract                                                      |
| Execution Environment | Off-chain (Node.js, browser)                               | On-chain (Somnia validators execute)                                                           |
| Gas / Costs           | None per notification (pay for node or rpc provider)       | Pays gas per invocation (from min 32 SOM balance)                                              |
| Latency               | Near-real-time (block time + network)                      | Block time (atomic with chain state)                                                           |
| State Access          | Include ETH view calls in sub; flexible queries            | Limited to handler logic; no external calls;Solidity contract does its own external view calls |
| Use Cases             | Front-ends (live UIs), backends (DB updates), integrations | DeFi (auto-compound), NFTs (reactive mints), oracles                                           |
| Reliability Options   | Can specify callback only executed when state changes      | Can specify if you want delivery regardless if block inclusion distance > 0, can also coalece  |
| Setup Complexity      | Install SDK, subscribe callback                            | Deploy handler contract, create/fund sub                                                       |
| Security              | App-level (e.g., auth WebSockets)                          | Blockchain-level (reentrancy risks in handlers)                                                |
| Scalability           | Handles high volume off-chain                              | Limited by gas/block; use coalescing for batches                                               |

#### When to Use Off-Chain Subscriptions

* **Pros**: No gas per event, easy integration with web apps, full access to external data/APIs.
* **Cons**: Relies on your app being online
* **Example**: Real-time dashboard updating on Transfer events without chain writes.

#### When to Use On-Chain Subscriptions

* **Pros**: Fully decentralized reactions; executes automatically on-chain.
* **Cons**: Gas costs accumulate; potential for loops if handlers emit events.
* **Example**: Smart contract that auto-swaps tokens on price oracle updates.

#### Hybrid Approaches

Combine both: Use off-chain for monitoring/UI, trigger on-chain actions via transactions when needed.


# Off-Chain (TypeScript)

### Overview

Tooling is as follows:

* TypeScript SDK - Compatible in NodeJS, Browser, JavaScript and Typescript environments
* React library (future) - Native hooks and react APIs for getting started with subscriptions following React best practives

See the quick start guide for getting started with the SDK

{% content-ref url="../quickstart" %}
[quickstart](https://docs.somnia.network/developer/reactivity/quickstart)
{% endcontent-ref %}



# On-chain (Solidity)

### Somnia Reactivity Precompile

The Somnia Reactivity Precompile is located at address `0x0100`. It provides an interface for managing event subscriptions.

#### Interface

The interface for the precompile is defined in `ISomniaReactivityPrecompile.sol`:

```solidity
interface ISomniaReactivityPrecompile {
    struct SubscriptionData {
        bytes32[4] eventTopics;      // Topic filter (0x0 for wildcard)
        address origin;              // Origin (tx.origin) filter (address(0) for wildcard)
        address caller;              // Caller (msg.sender) filter (address(0) for wildcard)
        address emitter;             // Contract emitting the event (address(0) for wildcard)
        address handlerContractAddress; // Address of the contract to handle the event
        bytes4 handlerFunctionSelector; // Function selector in the handler contract
        uint64 priorityFeePerGas;    // Extra fee to prioritize handling, in nanoSomi
        uint64 maxFeePerGas;         // Max fee willing to pay, in nanoSomi
        uint64 gasLimit;             // Maximum gas that will be provisioned per subscription callback
        bool isGuaranteed;           // If true, moves to next block if current is full
        bool isCoalesced;            // If true, multiple events can be coalesced
    }

    event SubscriptionCreated(uint64 indexed subscriptionId, address indexed owner, SubscriptionData subscriptionData);
    event SubscriptionRemoved(uint64 indexed subscriptionId, address indexed owner);

    function subscribe(SubscriptionData calldata subscriptionData) external returns (uint256 subscriptionId);
    function unsubscribe(uint256 subscriptionId) external;
    function getSubscriptionInfo(uint256 subscriptionId) external view returns (SubscriptionData memory subscriptionData, address owner);
}
```


# Subscription management

{% hint style="warning" %}
**Reactivity is currently only available on TESTNET**
{% endhint %}

Manage your reactivity subscriptions efficiently using the SDK, or do the same via Solidity by directly accessing the Somnia Reactivity Precompile. This covers creation, listing, querying, and cancellation for both off-chain (WebSocket) and on-chain (Solidity) types. Off-chain subscriptions are local to your app; on-chain are chain-managed and require funding (min 32 STT).

#### Off-Chain (WebSocket) Subscriptions

Off-chain subs use WebSockets for push notifications. Management is app-side—no chain queries needed.

**Creating a Subscription**

Use `sdk.subscribe()` to start listening. Returns an object with `unsubscribe()`.

```typescript
import { SDK, SubscriptionCallback } from '@somnia-chain/reactivity';

const subscription = await sdk.subscribe({
  ethCalls: [], // Optional: ETH view calls
  onData: (data: SubscriptionCallback) => {
    console.log('Event:', data);
  },
  // Other filters: eventTopics, origin, etc.
});

// Store subscription for later management
```

**Unsubscribing**

Call the returned method to stop.

```typescript
subscription.unsubscribe();
```

**Tips**

* Track subs in your app state (e.g., array of subscription objects).
* No listing/querying via SDK—handle locally as they're not persisted on-chain.

#### On-Chain (Solidity) Subscriptions

On-chain subs invoke handlers via EVM. Managed by the chain; owner must fund.

**Subscription Data Structure**

```typescript
export type SoliditySubscriptionData = {
  eventTopics?: Hex[]; // Optional filters
  origin?: Address;
  caller?: Address;
  emitter?: Address;
  handlerContractAddress: Address; // Required
  handlerFunctionSelector?: Hex; // Optional override
  priorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  gasLimit: bigint;
  isGuaranteed: boolean;
  isCoalesced: boolean;
};

export type SoliditySubscriptionInfo = {
  subscriptionData: SoliditySubscriptionData,
  owner: Address
};
```

**Creating a Subscription**

Returns tx hash on success.

```typescript
const subData: SoliditySubscriptionData = {
  handlerContractAddress: '0x123...',
  priorityFeePerGas: parseGwei('2'),
  maxFeePerGas: parseGwei('10'),
  gasLimit: 500_000n,
  isGuaranteed: true,
  isCoalesced: false,
  // Add filters as needed
};

const txHash = await sdk.createSoliditySubscription(subData);
if (txHash instanceof Error) {
  console.error(txHash.message);
} else {
  console.log('Created:', txHash);
}
```

**Getting Subscription Info**

Fetch details by ID.

```typescript
const info = await sdk.getSubscriptionInfo(123n); // bigint ID
if (info instanceof Error) {
  console.error(info.message);
} else {
  console.log('Info:', info);
}
```

**Cancelling a Subscription**

Returns txn hash on success. Only owner can cancel.

```typescript
const txHash = await sdk.cancelSoliditySubscription(123n);
if (txHash instanceof Error) {
  console.error(txHash.message);
} else {
  console.log('Canceled:', txHash);
}
```

#### Best Practices

* **Funding**: Ensure owner has 32+ STT; subs pause if low.
* **Error Handling**: Always check for Error instances.
* **Monitoring**: For on-chain, periodically list and query to monitor status.
* **Security**: Use private keys securely; avoid over-provisioning gas.

For full SDK reference, see API Reference.

### Solidity Subscription management

#### Creating Subscriptions

Whoever calls the `subscribe` function becomes the owner of the subscription. The owner can be EOA or a smart contract. In either case, the owner is required to hold a miniumum amount of STT and is responsible for paying the gas fees associated with handling events.

The `SubscriptionData` struct defines the criteria for the event subscription and how it should be handled:

* **eventTopics**: An array of 4 bytes32 values representing the event topics to filter by. Use `bytes32(0)` for wildcards.
* **origin**: Filters by the transaction origin (`tx.origin`). Use `address(0)` for any origin.
* **caller**: Filters by the message sender (`msg.sender`). Use `address(0)` for any caller.
* **emitter**: The address of the contract emitting the event. Use `address(0)` for any emitter.
* **handlerContractAddress**: The address of the contract that will be called when a matching event occurs.
* **handlerFunctionSelector**: The 4-byte function selector of the method to call on the handler contract.
* **priorityFeePerGas**: Additional gas fee paid to validators to prioritize this event handling. This is expressed in nanoSTT (gwei equivalent).
* **maxFeePerGas**: The maximum total gas fee (base + priority) the subscriber is willing to pay. This is expressed in nanoSTT (gwei equivalent).
* **gasLimit**: The maximum gas that will be provisioned per subscription callback
* **isGuaranteed**: If `true`, the event handling is guaranteed to execute, potentially moving to the next block if the current block is full.
* **isCoalesced**: If `true`, multiple matching events in the same block can be coalesced into a single handler call (implementation dependent).

A subscription can be handled by any smart contract (no special op codes). Additionally, the optional function selector can be used, that is prefixed to the event data when calling the handler contract.

**Handling Events**

When an event matching the subscription criteria is emitted, the Somnia Reactivity Precompile will invoke the specified handler contract and function. The handler contract can implement a function that matches the `handlerFunctionSelector` specified in the subscription. This function will be called with the event data when a matching event occurs. The owner of the subscription is charged the gas fees specified in the subscription for each event handled. The two fields indicate that the call the to handler has been initialized by the precompile:

* **msg.sender**: The Somnia Reactivity Precompile address (`0x0100`).
* **tx.origin**: The owner of the subscription.

#### Examples

**1. Fully On-Chain Subscription**

You can create subscriptions directly from another smart contract. This is useful for creating autonomous agents or protocols that react to network activity.

**Key Snippet:**

```solidity
ISomniaReactivityPrecompile.SubscriptionData memory subscriptionData = ISomniaReactivityPrecompile.SubscriptionData({
    eventTopics: [Transfer.selector, bytes32(0), bytes32(0), bytes32(0)],
    origin: address(0),
    caller: address(0),
    emitter: address(tokenAddress),
    handlerContractAddress: address(this),
    handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas: parseGwei('10'),
    isGuaranteed: true,
    isCoalesced: false
});

uint256 subscriptionId = somniaReactivityPrecompile.subscribe(subscriptionData);
```


# Tutorials

{% hint style="warning" %}
**Somnia Reactivity is currently only available on TESTNET**
{% endhint %}


# Wildcard Off-Chain Reactivity Tutorial

This tutorial shows how to set up an off-chain subscription in TypeScript to listen for *all* events emitted on the Somnia blockchain (wildcard mode). Notifications will push event data plus results from Solidity view calls (e.g., querying contract state like balances) in a single atomic payload. This reduces RPC roundtrips compared to traditional event listening + separate state fetches.

We'll use the Reactivity SDK for WebSocket subscriptions and viem for chain setup, ABI handling, and decoding. For familiarity, we'll subscribe to all events but decode a common one (ERC20 Transfer) in the callback.

Whilst most developers are unlikely to use reactivity in this way in production, there are scenarios where this will be useful:

* Testing reactivity before applying more filters (see our other tutorials)
* Building an indexer which scrapes required information from the chain into a secondary database that would serve other applications that want large volumes of historical chain data

#### Overview

Off-chain reactivity uses WebSockets to push notifications to your TypeScript app. Key features:

* **Wildcard Listening**: Catch every event without filters.
* **Bundled State**: Include ETH view calls executed at the event's block height.
* **Real-Time**: Low-latency updates for UIs, backends, or scripts.
* **No Gas Costs**: Off-chain, so free per notification (after setup).

This enables reactive apps like live dashboards or automated alerts.

Prerequisites:

* Node.js 20+
* Somnia testnet access (RPC: <https://dream-rpc.somnia.network>)
* Install dependencies: `npm i @somnia-chain/reactivity viem`

#### Key Objectives

1. **Set Up the Chain and SDK**: Configure viem for Somnia Testnet and initialize the SDK.
2. **Define ETH Calls**: Specify view functions to run on events (e.g., balanceOf).
3. **Create the Subscription**: Start a wildcard WebSocket sub with a data callback.
4. **Decode Notifications**: Use viem to parse event logs and function results.
5. **Run and Test**: Handle incoming data in real-time.

#### Step 1: Install Dependencies

```bash
npm i @somnia-chain/reactivity viem
```

#### Step 2: Define the Somnia Chain

Use viem's `defineChain` to configure the testnet.

```typescript
import { defineChain } from 'viem';

const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['ws://api.infra.testnet.somnia.network/ws'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['ws://api.infra.testnet.somnia.network/ws'],
    },
  },
});
```

#### Step 3: Initialize the SDK

Create a public client with WebSocket transport and pass it to the SDK.

```typescript
import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, webSocket } from 'viem';

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(),
});

const sdk = new SDK({ public: publicClient });
```

#### Step 4: Define ETH Calls

Specify view calls to execute when events emit. Here, we query an ERC721 balanceOf (adjust addresses as needed).

```typescript
import { encodeFunctionData, erc721Abi } from 'viem';

const ethCall = {
  to: '0x23B66B772AE29708a884cca2f9dec0e0c278bA2c', // Example Somnia ERC721 contract
  data: encodeFunctionData({
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: ['0x3dC360e0389683cA0341a11Fc3bC26252b5AF9bA'], // Example owner address
  }),
};
```

#### Step 5: Create the Wildcard Subscription

Subscribe with `ethCalls` and an `onData` callback. Omit filters for wildcard (all events).

```typescript
const subscription = await sdk.subscribe({
  ethCalls: [ethCall], // Array of calls; add more if needed
  onData: (data) => {
    console.log('Raw Notification:', data);
    // Decoding happens here (Step 6)
  },
});
```

* **Unsubscribe Later**: `subscription.unsubscribe();`

#### Step 6: Decode Data in the Callback

Use viem to decode the event log and function results. For example, assuming an ERC20 Transfer event (use `erc20Abi` from viem).

```typescript
import { decodeEventLog, decodeFunctionResult, erc20Abi } from 'viem';

// Inside onData:
const decodedLog = decodeEventLog({
  abi: erc20Abi, // Or your custom ABI
  topics: data.result.topics,
  data: data.result.data,
});

const decodedFunctionResult = decodeFunctionResult({
  abi: erc721Abi, // Match the call's ABI
  functionName: 'balanceOf',
  data: data.result.simulationResults[0], // First call's result
});

console.log('Decoded Event:', decodedLog); // e.g., { eventName: 'Transfer', args: { from, to, value } }
console.log('Decoded Balance:', decodedFunctionResult); // e.g., 42n
```

* **Notes**: `data.result` contains `topics`, `data` (event payload), and `simulationResults` (view call outputs). Handle errors if decoding fails (e.g., non-matching ABI).

#### Step 7: Put It All Together and Run

Full script (`main.ts`):

```typescript
// Imports from above...

async function main() {
  // Chain, client, SDK setup from Steps 2-3...

  // EthCall from Step 4...

  const subscription = await sdk.subscribe({
    ethCalls: [ethCall],
    onData: (data) => {
      // Decoding from Step 6...
    },
  });

  // Keep running (e.g., for a server) or unsubscribe after testing
}

main().catch(console.error);
```

Run: `ts-node main.ts` (install ts-node if needed).

#### Testing

1. Run the script.
2. Trigger events on Somnia Testnet (e.g., transfer ERC20 tokens via a wallet).
3. Watch console for decoded notifications.

* If no events: Deploy a test contract and emit manually.

#### Troubleshooting

* **No Data?** Ensure WebSocket RPC is connected; check filters (none for wildcard).
* **Decoding Errors?** Verify ABI matches the event/contract.
* **Connection Issues?** Use HTTP fallback if WS fails, but prefer WS for reactivity.

#### Next Steps

* Add filters (e.g., `eventTopics: ['0xddf...']` for Transfer keccak).
* Integrate with React (future hooks).
* Handle multiple ethCalls/decodes.
* Explore on-chain version: On-Chain Tutorial.


# Off-Chain Reactivity: Filtered Subscriptions tutorial

This tutorial builds on basic off-chain reactivity by adding filters to your WebSocket subscriptions. While wildcard (all events) is great for quick testing and seeing reactivity in action, it's often too verbose for production—flooding logs with irrelevant data. Instead, use filters to target specific emitters or events, making your app more efficient and focused.

We'll subscribe to Transfer events from a specific ERC20 contract, include a view call (e.g., balanceOf), and enable `onlyPushChanges` to notify only on state changes. This is ideal for real-time UIs or monitoring without noise.

#### Overview

Off-chain subscriptions push filtered events + state via WebSockets to TypeScript apps. Filters reduce volume:

* **eventContractSources**: Limit to specific emitter addresses.
* **topicOverrides**: Filter by event topics (e.g., keccak256 signatures like Transfer's `0xddf...`).
* **onlyPushChanges**: Skip notifications if ethCalls results match the previous one.
* **ethCalls**: Optional view calls for bundled state.
* **onError**: Handle failures gracefully.

No gas costs; runs off-chain.

Prerequisites:

* Same as wildcard tutorial: Node.js, `npm i @somnia-chain/reactivity viem`.
* Know your target contract/event (e.g., ERC20 Transfer).

#### Key Objectives

1. **Set Up Chain and SDK**: Configure viem and initialize SDK.
2. **Define Filters and ETH Calls**: Specify emitters, topics, and views.
3. **Create Filtered Subscription**: Use params for targeted listening.
4. **Decode and Handle Data**: Parse with viem; add error handling.
5. **Run and Optimize**: Test with `onlyPushChanges`.

#### Step 1: Install Dependencies

```bash
npm i @somnia-chain/reactivity viem
```

#### Step 2: Define the Somnia Chain

(Reuse from wildcard tutorial.)

```typescript
import { defineChain } from 'viem';

const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  // ... full config as before
});
```

#### Step 3: Initialize the SDK

```typescript
import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, webSocket } from 'viem';

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(),
});

const sdk = new SDK({ public: publicClient });
```

#### Step 4: Define ETH Calls and Filters

* **ethCalls**: Query balanceOf on an ERC20.
* **eventContractSources**: Array of emitter addresses (e.g., one ERC20 contract).
* **topicOverrides**: Hex for event signatures (e.g., Transfer: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`).

```typescript
import { encodeFunctionData, erc20Abi, keccak256, toHex } from 'viem';

// Example: Transfer topic (keccak256('Transfer(address,address,uint256)'))
const transferTopic = keccak256(toHex('Transfer(address,address,uint256)'));

const ethCall = {
  to: '0xExampleERC20Address', // Your target ERC20
  data: encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: ['0xYourWalletAddress'], // Monitor this balance
  }),
};

const filters = {
  eventContractSources: ['0xExampleERC20Address'], // Filter to this emitter
  topicOverrides: [transferTopic], // Only Transfer events
};
```

#### Step 5: Create the Filtered Subscription

Include `onlyPushChanges: true` to notify only on balance changes. Add `onError` for robustness.

```typescript
const subscription = await sdk.subscribe({
  ethCalls: [ethCall], // Bundled state query
  ...filters, // From Step 4
  onlyPushChanges: true, // Efficient: Skip if balance unchanged
  onData: (data) => {
    console.log('Filtered Notification:', data);
    // Decoding here (Step 6)
  },
  onError: (error) => {
    console.error('Subscription Error:', error.message);
    // Retry logic or alert
  },
});

// Unsubscribe: subscription.unsubscribe();
```

#### Step 6: Decode Data in the Callback

Parse the event (Transfer) and view result (balanceOf).

```typescript
import { decodeEventLog, decodeFunctionResult } from 'viem';

// Inside onData:
const decodedLog = decodeEventLog({
  abi: erc20Abi,
  topics: data.result.topics,
  data: data.result.data,
});

const decodedBalance = decodeFunctionResult({
  abi: erc20Abi,
  functionName: 'balanceOf',
  data: data.result.simulationResults[0],
});

console.log('Decoded Transfer:', decodedLog.args); // { from, to, value }
console.log('New Balance:', decodedBalance);
```

#### Step 7: Put It All Together and Run

Full script (`main.ts`):

```typescript
// Imports...

async function main() {
  // Chain, client, SDK from Steps 2-3...

  // ethCall and filters from Step 4...

  const subscription = await sdk.subscribe({
    ethCalls: [ethCall],
    ...filters,
    onlyPushChanges: true,
    onData: (data) => {
      // Decoding from Step 6...
    },
    onError: (error) => console.error(error),
  });

  // Run indefinitely or unsubscribe on signal
}

main().catch(console.error);
```

Run: `ts-node main.ts`.

#### Testing

1. Run the script.
2. Trigger a Transfer on the filtered contract (e.g., send tokens).
3. See notifications only on relevant events/changes.

* If too quiet: Remove `onlyPushChanges` or broaden filters.
* Prod Tip: Start with wildcard for debugging, then add filters.

#### Troubleshooting

* **No Notifications?** Verify topics/address (use explorers for keccak). Check WS connection.
* **Errors?** Handle in onError; common: Invalid filters or RPC issues.
* **Too Many?** Tighten topicOverrides or eventContractSources.

#### Next Steps

* Multi-emitters: Add more to eventContractSources.
* Custom Events: Compute topics for your ABI.
* Advanced: Combine with React for live UIs.
* Compare to On-Chain: On-Chain Tutorial.



# Solidity on-chain Reactivity Tutorial

This tutorial guides you through building on-chain reactivity on Somnia. You'll create a smart contract that reacts to events from other contracts automatically—invoked by chain validators. Subscriptions trigger handler logic directly in the EVM.

### Overview

On-chain reactivity lets Solidity contracts "subscribe" to events emitted by other contracts. When an event fires, your handler contract gets called with the event data, enabling automated business logic like auto-swaps or updates. This is powered by Somnia's native push mechanism, funded by a minimum SOM balance (currently 32 SOM) held by the subscription owner.

Key benefits:

* Atomic: Event + state from the same block (state reads have to be handled by your own contract unlike off-chain subscriptions).
* Decentralized: Runs on-chain without off-chain servers removing liveness assumptions.
* Efficient: Pay only for invocations via gas params.

Prerequisites:

* Solidity basics (e.g., Remix, Hardhat, or Foundry).
* Somnia testnet wallet with 32+ SOM (faucet: <https://docs.somnia.network/developer/network-info>).
* TypeScript SDK for subscription management (install: `npm i @somnia-chain/reactivity`) or manage the subscription directly with the precompile contract on-chain

#### Key Objectives

1. **Create a SomniaEventHandler Contract**: Inherit from the abstract contract and override `_onEvent` virtual function with your logic.
2. **Deploy the Handler**: Use your tool of choice (e.g., Remix or Hardhat).
3. **Create a Subscription**: Use the SDK to set up and fund the sub (owner must hold min SOM) or setup the subscription in Solidity.
4. **Handle Callbacks**: The chain invokes your handler on matching filters based on subscription configuration.

#### Step 1: Install Dependencies

Install the reactivity contracts package for the `SomniaEventHandler` abstract contract:

```bash
npm i @somnia-chain/reactivity-contracts
```

This provides the interface to import. (Public Foundry repo coming soon for easier Forge integration.)

#### Step 2: Create the Handler Contract

Inherit from `SomniaEventHandler` and implement `_onEvent`. This is where your business logic goes—e.g., update state or call other contracts.

Example: A simple handler that logs or reacts to any event (wildcard).

```solidity
pragma solidity ^0.8.20;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract MyEventHandler is SomniaEventHandler {

    event ReactedToEvent(address emitter, bytes32 topic);

    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Your business logic here
        // Example: Emit a new event or update storage
        emit ReactedToEvent(emitter, eventTopics[0]);

        // Be cautious: Avoid reentrancy or infinite loops (e.g., don't emit events that trigger this handler)
    }
}
```

* **Customization**: Filter in the subscription (Step 4) or add checks in `_onEvent` (e.g., if `emitter == specificAddress`).
* **Warnings**: Keep gas usage low; handlers run in validator context. Test for reentrancy.

#### Step 3: Deploy the Handler

* **Using Remix**: Paste code, compile, deploy to Somnia testnet RPC (<https://docs.somnia.network/developer/network-info>).
* **Using Hardhat**: Set up a project, add the contract, and deploy script.

Example Hardhat deploy script (`scripts/deploy.ts`):

```typescript
import { ethers } from "hardhat";

async function main() {
  const Handler = await ethers.getContractFactory("MyEventHandler");
  const handler = await Handler.deploy();
  await handler.deployed();
  console.log("Handler deployed to:", handler.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run: `npx hardhat run scripts/deploy.ts --network somniaTestnet` (configure networks in `hardhat.config.ts`).

Note the deployed address (e.g., `0x123...`).

#### Step 4: Create and Manage the Subscription

Use the TypeScript SDK to create the subscription. The caller becomes the owner and must hold 32+ SOM.

```typescript
import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts'; 
import { createPublicClient, createWalletClient, http } from 'viem';

// Initialize SDK with the required clients
const sdk = new SDK({
  public: createPublicClient({
    chain: somniaTestnet,
    transport: http()
  }),
  wallet: createWalletClient({
      account: privateKeyToAccount(process.env.PRIVATE_KEY),
      chain: somniaTestnet,
      transport: http(),
  })
});

const subData = {
  handlerContractAddress: '0xYourDeployedHandlerAddress',
  priorityFeePerGas: parseGwei('2'),
  maxFeePerGas: parseGwei('10'),
  gasLimit: 500_000n, // Adjust based on handler complexity
  isGuaranteed: true, // Retry on failure
  isCoalesced: false, // One call per event
  // Optional filters: eventTopics: ['0x...'], emitter: '0xTargetContract'
};

const txHash = await sdk.createSoliditySubscription(subData);
if (txHash instanceof Error) {
  console.error('Creation failed:', txHash.message);
} else {
  console.log('Subscription created! Tx:', txHash);
}
```

* **Funding**: Chain enforces min SOM; top up if needed.
* **Filters:** See API reference for more filters that can be passed to createSoliditySubscription

#### Step 5: Test the Callback

1. Deploy an emitter contract that emits events (e.g., simple ERC20 with Transfer).
2. Trigger an event (e.g., transfer tokens).
3. Check your handler: Use explorers or logs to see `_onEvent` executed (e.g., your `ReactedToEvent` emitted).

#### Troubleshooting

* **No Invocation?** Verify sub ID (via `sdk.getSubscriptionInfo`), filters match, and balance funded.
* **Gas Errors?** Increase `gasLimit` or optimize handler.
* **Cancel**: `await sdk.cancelSoliditySubscription(subId);` (get ID from listing).

#### Next Steps

* Add filters for targeted reactivity.
* Integrate with DeFi/NFT logic.
* Explore hybrid: Off-chain monitoring + on-chain actions.


# Cron subscriptions via SDK

Starting from `@somnia-chain/reactivity@0.1.9`, the typescript SDK introduces two new convenience functions to streamline creating subscriptions for [system-generated events](https://docs.somnia.network/developer/reactivity/system-events): `BlockTick` and `Schedule`. These functions reduce boilerplate by handling the underlying `SubscriptionData` structure and precompile interactions for you, while still allowing customization of gas fees, guarantees, and other parameters.

For a deeper understanding of how these system events work under the hood (including event signatures and behaviors), refer to the [System Events documentation](https://docs.somnia.network/developer/reactivity/system-events).

### Block Tick Subscription

The `BlockTick` event triggers at the start of every block if no specific block number is provided, or at a targeted block if specified.

#### Using the SDK&#x20;

Use `createOnchainBlockTickSubscription` to set up the subscription with minimal code:

```typescript
import { SDK } from '@somnia-chain/reactivity';

// Assuming you have an instance of SomniaReactivity SDK
const reactivity = new SDK(/* your config */);

async function setupBlockTick() {
  try {
    const txHash = await reactivity.createOnchainBlockTickSubscription({
      // Optional: Specify a future block number; omit for every block
      // blockNumber: BigInt(123456789),
      handlerContractAddress: '0xYourHandlerContractAddress',
      // Optional: Override default handler selector (defaults to onEvent)
      // handlerFunctionSelector: '0xYourSelector',
      priorityFeePerGas: BigInt(1000000000), // 1 nanoSomi
      maxFeePerGas: BigInt(20000000000), // 20 nanoSomi
      gasLimit: BigInt(100000),
      isGuaranteed: true, // Ensure delivery even if delayed
      isCoalesced: false // Handle each event separately
    });
    console.log('Subscription created with tx hash:', txHash);
  } catch (error) {
    console.error('Error creating subscription:', error);
  }
}

setupBlockTick();
```

This returns the transaction hash on success or an error if the subscription fails.

#### Equivalent in Solidity

For comparison, here's the lower-level Solidity equivalent (as in the core docs):

```solidity
ISomniaReactivityPrecompile.SubscriptionData
    memory subscriptionData = ISomniaReactivityPrecompile
        .SubscriptionData({
            eventTopics: [BlockTick.selector, bytes32(0), bytes32(0), bytes32(0)], // Or specify blockNumber in topics[1]
            emitter: SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS,
            handlerContractAddress: address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            /* Add gas params, isGuaranteed, isCoalesced here */
    });
// Then call subscribe(subscriptionData) on the precompile
```

### Schedule Event (One-Off Cron Job)

The `Schedule` event is ideal for one-time future actions. Key notes:

* Timestamp must be in the future (at least 12 seconds from n ow).
* It's a one-off subscription—automatically deleted after triggering.
* Use milliseconds (e.g., via [currentmillis.com](https://currentmillis.com/)).

#### Using the SDK

Use `scheduleOnchainCronJob` for a simple setup:

```typescript
import { SDK } from '@somnia-chain/reactivity';

// Assuming you have an instance of SomniaReactivity
const reactivity = new SDK(/* your config */);

async function setupSchedule() {
  try {
    const txHash = await reactivity.scheduleOnchainCronJob({
      timestampMs: 1794395471011, // e.g., Nov 11, 2026, 11:11:11.011
      handlerContractAddress: '0xYourHandlerContractAddress',
      // Optional: Override default handler selector (defaults to onEvent)
      // handlerFunctionSelector: '0xYourSelector',
      priorityFeePerGas: BigInt(1000000000), // 1 nanoSomi
      maxFeePerGas: BigInt(20000000000), // 2 nanoSomi
      gasLimit: BigInt(100000),
      isGuaranteed: true, // Ensure delivery even if delayed
      isCoalesced: false // N/A for one-off, but included for consistency
    });
    console.log('Cron job scheduled with tx hash:', txHash);
  } catch (error) {
    console.error('Error scheduling cron job:', error);
  }
}

setupSchedule();
```

This returns the transaction hash on success or an error if the subscription fails.

#### Equivalent in Solidity

For comparison, here's the lower-level Solidity equivalent (as in the core docs):

```solidity
ISomniaReactivityPrecompile.SubscriptionData
    memory subscriptionData = ISomniaReactivityPrecompile
        .SubscriptionData({
            eventTopics: [Schedule.selector, bytes32(uint256(1794395471011)), bytes32(0), bytes32(0)],
            emitter: SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS,
            handlerContractAddress: address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            /* Add gas params, isGuaranteed, isCoalesced here */
    });
// Then call subscribe(subscriptionData) on the precompile
```

{% hint style="info" %}
These SDK functions default the `emitter` to `SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS` and handle event topics automatically, ensuring your handler only responds to genuine system events.
{% endhint %}

To get started, update your typescript SDK package to `@somnia-chain/reactivity@0.1.9` or later and integrate these functions into your dApp. \
\
If you need more advanced customizations (e.g., additional filters like origin or caller), you can still use the full `SoliditySubscriptionData` type directly with the `createSoliditySubscription` SDK function (scheduleOnchainCronJob is calling that internally).&#x20;

See [solidity-on-chain-reactivity-tutorial](https://docs.somnia.network/developer/reactivity/tutorials/solidity-on-chain-reactivity-tutorial "mention") for a tutorial on how to create a regular subscription to any event emitted by any smart contract.




# Gas Configuration

Properly configuring gas parameters is critical for on-chain reactivity subscriptions. If gas values are too low, validators will silently skip your subscription — no error, no warning, just nothing happens.

{% hint style="danger" %}
**This is the #1 cause of "reactivity not working."** Most developers set up their contracts and subscriptions correctly, but use gas values that are too low for validators to process.
{% endhint %}

## Understanding the Parameters

On-chain reactivity subscriptions require three gas parameters:

| Parameter           | Description                                                 | Unit            |
| ------------------- | ----------------------------------------------------------- | --------------- |
| `priorityFeePerGas` | Tip paid to validators to prioritize your handler execution | gwei (nanoSomi) |
| `maxFeePerGas`      | Maximum total fee per gas (base fee + priority fee)         | gwei (nanoSomi) |
| `gasLimit`          | Maximum gas provisioned per handler invocation              | gas units       |

### How They Work Together

{% stepper %}
{% step %}

### priorityFeePerGas

This is essentially the "tip" for validators. The default value is 0 nanoSomi. Increase it to make sure your handler is executed before others.
{% endstep %}

{% step %}

### maxFeePerGas

The ceiling on what you'll pay per gas unit. The minimum is `baseFee + priorityFeePerGas` , where the base fee in Somnia is 6 nanoSomi. Setting this too low will cause your handler invocation to fail in peak times.
{% endstep %}

{% step %}

### gasLimit

How much gas your `_onEvent` handler is allowed to consume. If your handler runs out of gas, it reverts.
{% endstep %}
{% endstepper %}

## Recommended Values

### Standard Use Cases

```typescript
import { parseGwei } from 'viem';

await sdk.createSoliditySubscription({
  handlerContractAddress: '0x...',
  emitter: '0x...',
  eventTopics: [eventSignature],
  priorityFeePerGas: parseGwei('0'), // 0 gwei — typically, no priority is required 
  maxFeePerGas: parseGwei('10'),     // 10 gwei — comfortable ceiling
  gasLimit: 2_000_000n,              // Sufficient for simple state updates
  isGuaranteed: true,
  isCoalesced: false,
});
```

### By Handler Complexity

<table data-header-hidden><thead><tr><th></th><th align="right"></th><th align="right"></th><th width="133.265625" align="right"></th><th></th></tr></thead><tbody><tr><td>Handler Type</td><td align="right"><code>priorityFeePerGas</code></td><td align="right"><code>maxFeePerGas</code></td><td align="right"><code>gasLimit</code></td><td>Example</td></tr><tr><td><strong>Simple</strong> (state updates, emit event)</td><td align="right"><code>parseGwei('0')</code></td><td align="right"><code>parseGwei('10')</code></td><td align="right"><code>2_000_000n</code></td><td>Counter, token reward</td></tr><tr><td><strong>Medium</strong> (cross-contract calls)</td><td align="right"><code>parseGwei('0')</code></td><td align="right"><code>parseGwei('10')</code></td><td align="right"><code>3_000_000n</code></td><td>Game logic with external calls</td></tr><tr><td><strong>Complex</strong> (multiple external calls, loops)</td><td align="right"><code>parseGwei('10')</code></td><td align="right"><code>parseGwei('20')</code></td><td align="right"><code>10_000_000n</code></td><td>Settlement, multi-step workflows</td></tr></tbody></table>

### Quick Reference Table (Raw BigInt Values)

If you prefer raw values instead of `parseGwei()`:

| Level               | `priorityFeePerGas` |    `maxFeePerGas` |    `gasLimit` |
| ------------------- | ------------------: | ----------------: | ------------: |
| Minimum recommended |                `0n` | `10_000_000_000n` |  2`_000_000n` |
| Comfortable         |                `0n` | `10_000_000_000n` |  3`_000_000n` |
| High priority       |   `10_000_000_000n` | `20_000_000_000n` | `10_000_000n` |

## Common Mistakes

### Using wei instead of gwei

```typescript
// WRONG — these are 10 wei and 20 wei, essentially zero
priorityFeePerGas: 10n,
maxFeePerGas: 20n,

// CORRECT — these are 2 gwei and 10 gwei
priorityFeePerGas: parseGwei('2'),    // = 2_000_000_000n
maxFeePerGas: parseGwei('10'),         // = 10_000_000_000n
```

{% hint style="warning" %}
`10n` is **10 wei** = 0.00000001 gwei. This is 200 million times less than the recommended 2 gwei. Always use `parseGwei()` to avoid unit confusion. See [somi-coin](https://docs.somnia.network/developer/network-info/somi-coin "mention") for details on how this is calculated.
{% endhint %}

### Computing from gasPrice with too-small divisors

```typescript
// RISKY — gas price fluctuates and dividing by 10 may yield too-low values
const gasPrice = await publicClient.getGasPrice();
priorityFeePerGas: gasPrice / 10n,

// SAFER — use fixed proven values
priorityFeePerGas: parseGwei('2'),
```

### Setting gasLimit too low

Somnia operates on a different gas model to Ethereum. One of the key differences is that  the 1,000,000 gas reserve is required for any storage operations, see [#storage-evm-operations](https://docs.somnia.network/deployment-and-production/somnia-gas-differences-to-ethereum#storage-evm-operations "mention"). It is safe to up your gas limit to meet the reserve requirements.  If your handler reverts due to out-of-gas, the subscription still charges you but the state change doesn't happen.

```typescript
// TOO LOW for any storage operations
gasLimit: 100_000n,

// SAFE for most handlers
gasLimit: 2_000_000n,

// SAFE for complex handlers with external calls
gasLimit: 10_000_000n,
```

### Forgetting to recreate subscription after redeploying

Subscriptions are tied to specific contract addresses. If you redeploy your contract, you get a new address. The old subscription won't trigger for the new contract.

```
Deploy contract → address A
Create subscription → emitter: A, handler: A  ✅

Redeploy contract → address B
Old subscription still points to A → ❌ won't work
Must create NEW subscription → emitter: B, handler: B  ✅
```

## Cost Estimation

The subscription owner pays for each handler invocation. The cost per invocation is:

```
cost = gasUsed × effectiveGasPrice
```

Where `effectiveGasPrice` is at most `maxFeePerGas` and at least `baseFee + priorityFeePerGas`.

### Example

For a simple handler using \~50,000 gas at 10 gwei max fee:

```
cost ≈ 50,000 × 10 gwei = 500,000 gwei = 0.0005 SOM per invocation
```

The subscription owner must maintain at least **32 SOMI** balance. This is not spent — it's a minimum holding requirement. Actual costs are deducted per invocation.

## Debugging Gas Issues

If your subscription was created successfully but the handler is never invoked:

{% stepper %}
{% step %}

### Check subscription info

```typescript
const info = await sdk.getSubscriptionInfo(subscriptionId);
console.log(JSON.stringify(info, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
```

Verify that `priorityFeePerGas` is at least `2000000000` (2 gwei).
{% endstep %}

{% step %}

### Test with a CLI script first

Before debugging frontend issues, confirm reactivity works via a Hardhat script:

```typescript
// 1. Call your contract function that emits the event
const tx = await contract.myFunction();
await tx.wait();

// 2. Poll for state change
for (let i = 0; i < 15; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const result = await contract.myStateVariable();
  if (result !== previousValue) {
    console.log('Reactivity worked!');
    break;
  }
}
```

{% endstep %}

{% step %}

### Look for validator transactions

On-chain reactivity is executed by validators from the address `0x0000000000000000000000000000000000000100`. Check the block explorer for transactions from this address to your handler contract after your event was emitted.
{% endstep %}
{% endstepper %}

## Summary

| Do                                       | Don't                                           |
| ---------------------------------------- | ----------------------------------------------- |
| Use `parseGwei('2')` for priority fee    | Use raw small numbers like `10n` or `100n`      |
| Use `parseGwei('10')` for max fee        | Compute from `gasPrice` with arbitrary divisors |
| Set gasLimit based on handler complexity | Use a one-size-fits-all low gasLimit            |
| Recreate subscription after redeploying  | Assume old subscription works with new contract |
| Test via CLI before building frontend    | Debug reactivity issues through the browser     |


# FAQs & Troubleshooting

### FAQs

{% hint style="warning" %}
**Somnia Reactivity is currently only available on TESTNET**
{% endhint %}

#### How Do I Fetch Historical Data?

To get event and state data from before an application subscription was created there are a few approaches:

* Use a traditional indexer or tooling such as a subgraph
* Build a custom indexer which starts at an earlier block and persists data received from Somnia reactivity into a DB that can be queried from the chain
* Directly query historical data from the chain from within your application (generally inefficient)

### Troubleshooting

#### Issues starting websocket subscriptions

Two core reasons for this:

1. The chain definition for the Somnia testnet or mainnet does not contain a wss url
2. The wss url does not support the reactivity feature set or the rpc provider is having issues

#### Too many active websocket subscriptions

Often seen in React applications where `useEffect` is not being used correctly or not used at all to start an event subscription leading to attempts to create a subscription every time the page renders

#### Solidity handler not being invoked

Three core reasons for this:

1. Invalid implementation of `SomniaEventHandler` interface
2. No active subscription
3. Insufficient subscription balance&#x20;



# API Reference

{% hint style="warning" %}
**Somnia Reactivity is currently only available on TESTNET**
{% endhint %}

### Off-chain (TypeScript)

#### WebSocket Subscription Initialization Params

```typescript
/**
 * @property The notification result data containing information about the event topic, data and view results
 */
export type SubscriptionCallback = {
  result: {
    topics: Hex[],
    data: Hex,
    simulationResults: Hex[]
  }
}

/**
 * @property ethCalls Fixed set of ETH calls that must be executed before onData callback is triggered. Multicall3 is recommended. Can be an empty array
 * @property context Event sourced selectors to be added to the data field of ETH calls, possible values: topic0, topic1, topic2, topic3, data and address
 * @property onData Callback for a successful reactivity notification
 * @property onError Callback for a failed attempt 
 * @property eventContractSources Alternative contract event source(s) (any on somnia) that will be emitting the logs specified by topicOverrides
 * @property topicOverrides Optional filter for specifying topics of interest, otherwise wildcard filter is applied (all events watched)
 * @property onlyPushChanges Whether the data should be pushed to the subscriber only if eth_call results are different from the previous
 */
export type WebsocketSubscriptionInitParams = {
    ethCalls: EthCall[]
    context?: string
    onData: (data: SubscriptionCallback) => void
    onError?: (error: Error) => void
    eventContractSources?: Address[]
    topicOverrides?: Hex[]
    onlyPushChanges?: boolean
}
```

An object of type `WebsocketSubscriptionInitParams` is the only required argument to the `subscribe` function required to create a subscription to a Somnia node to become notified about event + state changes that take place on-chain

Example:

```typescript
const subscription = await sdk.subscribe({
  ethCalls: [], // State to read when events are emitted
  onData: (data: SubscriptionCallback) => console.log('Received:', data),
})
```

#### Solidity Subscription Creation from SDK

```typescript
/**
 * @property eventTopics Optional event filters
 * @property origin Optional tx.origin filter
 * @property caller Optional msg.sender filter
 * @property emitter Optional contract event emitter filter
 * @property handlerContractAddress Contract that will handle subscription callback
 * @property handlerFunctionSelector Optional override for specifying callback handler function
 * @property priorityFeePerGas Additional priority fee that will be paid per gas consumed by callback
 * @property maxFeePerGas Maximum fee per gas the subscriber is willing to pay (base fee + priority fee)
 * @property gasLimit Maximum gas that will be provisioned per subscription callback
 * @property isGuaranteed Whether event notification must be delivered regardless of block inclusion distance from emission
 * @property isCoalesced Whether multiple events can be coalesced into a single handling call per block
 */
export type SoliditySubscriptionData = {
    eventTopics?: Hex[];
    origin?: Address;
    caller?: Address;
    emitter?: Address;
    handlerContractAddress: Address;
    handlerFunctionSelector?: Hex;
    priorityFeePerGas: bigint;      
    maxFeePerGas: bigint;
    gasLimit: bigint;
    isGuaranteed: boolean;
    isCoalesced: boolean;
}
```

Example:

```typescript
await sdk.createSoliditySubscription({
  handlerContractAddress: '0x123...',
  priorityFeePerGas: 10n,
  maxFeePerGas: 20n,
  gasLimit: 500_000n,
  isGuaranteed: true,
  isCoalesced: false,
});
```

#### Solidity subscription info query from SDK

```typescript
export type SoliditySubscriptionInfo = {
  subscriptionData: SoliditySubscriptionData,
  owner: Address
}
```

Example:

```typescript
const subscriptionId = 1n;
const subscriptionInfo: SoliditySubscriptionInfo = await sdk.getSubscriptionInfo(
    subscriptionId
);
```
