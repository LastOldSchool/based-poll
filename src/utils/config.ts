import { base } from "viem/chains";

// Chain configuration
export const chains = {
  mainnet: base,
  testnet: base
};

// Contract addresses
export const POLL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POLL_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

// ABI for the Poll contract
export const POLL_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_prePollId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_optionCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_deadline",
        "type": "uint256"
      }
    ],
    "name": "calculateActualPollId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_pollId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "_voter",
        "type": "address"
      }
    ],
    "name": "checkVote",
    "outputs": [
      {
        "internalType": "bool",
        "name": "hasVoted",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "optionId",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_prePollId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_optionCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_deadline",
        "type": "uint256"
      }
    ],
    "name": "createPoll",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_pollId",
        "type": "bytes32"
      }
    ],
    "name": "getPoll",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "voteCounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint8",
        "name": "optionCount",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_prePollId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_optionCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_deadline",
        "type": "uint256"
      }
    ],
    "name": "getPollByParams",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "voteCounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint8",
        "name": "optionCount",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_pollId",
        "type": "bytes32"
      }
    ],
    "name": "isPollEnded",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_prePollId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_optionId",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "_optionCount",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_deadline",
        "type": "uint256"
      }
    ],
    "name": "vote",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]; 