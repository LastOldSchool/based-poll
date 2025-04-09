# Based Poll Smart Contracts

This project contains the smart contracts for the Based Poll application, built with Hardhat and deployed on the Base network.

## Overview

The project includes:
- A `Poll` contract that enables decentralized polling functionality
- Hardhat Ignition deployment scripts
- Configuration for Base mainnet and testnet deployments

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### Installation

```shell
# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory with your private key and BaseScan API key:

```
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your actual keys
```

## Available Commands

```shell
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Run local node
npx hardhat node

# Deploy Poll contract to Base testnet (Goerli)
npx hardhat ignition deploy ./ignition/modules/Poll.ts --network baseGoerli

# Deploy Poll contract to Base mainnet
npx hardhat ignition deploy ./ignition/modules/Poll.ts --network base
```

## Deployment

To deploy to Base mainnet:

1. Ensure your `.env` file contains your private key
2. Run the deployment command:
   ```
   npx hardhat ignition deploy ./ignition/modules/Poll.ts --network base
   ```
3. Verify the contract on BaseScan (requires BASESCAN_API_KEY in .env):
   ```
   npx hardhat verify --network base <CONTRACT_ADDRESS>
   ```

## Contract Verification

After deployment, verify your contract on BaseScan:

```shell
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

## License

This project is licensed under the MIT License.
