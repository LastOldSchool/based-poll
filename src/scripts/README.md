# Poll Contract Utility Scripts

This directory contains utility scripts for interacting with the Poll contract on the Base network.

## Available Scripts

### poll-vote-test.ts

A TypeScript script that checks a voter's status on a specific poll and displays vote information.

#### Usage

```bash
npx ts-node src/scripts/poll-vote-test.ts
```

#### Features

- Checks if a user has voted on a poll
- Retrieves poll details including deadlines and vote counts
- Displays a summary of voting statistics
- Shows percentage breakdowns for each option

#### Configuration

Edit the script to modify:
- `POLL_IDS`: Array of poll IDs to check
- `VOTER_ADDRESS`: The wallet address to check votes for

### Note

This directory is excluded from TypeScript checks during the build process through tsconfig.json settings. 