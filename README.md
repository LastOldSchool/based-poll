# Supechain Poll

A polling application that stores votes on the Base blockchain. Users can create polls, vote once per poll, and view results in real-time.

## Features

- Votes stored on Base blockchain
- Poll questions and options stored off-chain
- One wallet = one vote per poll
- Polls close automatically at deadline
- Live vote count updates
- Mobile and desktop support
- Optimized for low gas costs

## Technology

- Next.js 15 / React 19
- TypeScript
- Tailwind CSS
- [DappyKit](https://github.com/DappyKit) for blockchain connection
- Solidity 0.8.28 contracts
- Base blockchain
- [Web4](https://github.com/DappyKit/web4-apps-specification) specification

## Storage Design

Split storage for efficiency:

**Blockchain storage:**
- Vote counts
- Deadlines
- User voting records
- Option counts

**Off-chain storage:**
- Poll questions
- Option text
- UI settings

This reduces transaction costs while keeping vote integrity on-chain.

## Smart Contract

### Poll ID System

Two-part ID generation:

1. **Pre-Poll ID**: Hash of the poll question (created off-chain)
2. **Final Poll ID**: Hash of pre-poll ID + option count + deadline
   ```solidity
   bytes32 pollId = keccak256(abi.encode(prePollId, optionCount, deadline));
   ```

All poll data is mapped to this ID:
```solidity
mapping(bytes32 => PollData) public polls;
```

### Data Structure

Each poll contains:
```solidity
struct PollData {
    uint256 deadline;         // When voting ends
    bool exists;              // If poll exists
    mapping(address => uint8) votes; // Who voted for what (0 = no vote)
    uint256[] voteCounts;     // Tally of votes per option
    uint8 optionCount;        // Number of options (2-6)
}
```

This structure:
- Prevents duplicate votes
- Uses minimal storage
- Enables fast vote verification

### Main Functions

- **createPoll**: Creates poll with 2-6 options and future deadline
- **vote**: Records a vote after validating:
  - Poll is active
  - User hasn't voted
  - Option is valid
- **getPoll**: Gets current poll data
- **checkVote**: Checks if an address has voted
- **isPollEnded**: Checks if poll has ended

### Vote Recording

- User votes stored using 1-based indexing (1-6)
- Vote count array uses 0-based indexing (0-5)
- When voting, the contract:
  1. Records `poll.votes[userAddress] = optionId;`
  2. Increases `poll.voteCounts[optionId-1]++;`

### Contract Events

Two main events:
- `PollCreated`: When poll is created
- `VoteCast`: When vote is recorded

## Getting Started

### Requirements

- Node.js 18+
- NPM or Yarn
- Web3 wallet with Base network

### Setup

1. Clone repository:
```bash
git clone https://github.com/LastOldSchool/based-poll.git
cd based-poll
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with:
```
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
```

4. Build and run:
```bash
npm run build
npm start
```

### Development

Run development server:
```bash
npm run dev
```

Run tests and checks:
```bash
npm run test
npm run lint:check
npm run format:check
npm run types:check
```

## Usage

### Creating Polls

Create a JSON file:
```json
{
  "question": "Your poll question?",
  "options": [
    { "id": 1, "text": "Option 1" },
    { "id": 2, "text": "Option 2" }
  ],
  "deadline": 1735689600
}
```
Deadline is a Unix timestamp.

### Voting

Connect your wallet, select an option, and submit. Your vote is stored on the blockchain and the display updates immediately.

### Results

The interface shows:
- Total votes
- Vote distribution
- Your vote (if any)
- Poll status (active/ended)

## License

MIT License - see LICENSE file for details.
