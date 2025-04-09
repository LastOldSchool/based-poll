// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition module for deploying the Poll contract
 * The Poll contract provides on-chain voting functionality with time-based restrictions
 */
const PollModule = buildModule("PollModule", (m) => {
  // Deploy the Poll contract
  const poll = m.contract("Poll", []);

  return { poll };
});

export default PollModule; 