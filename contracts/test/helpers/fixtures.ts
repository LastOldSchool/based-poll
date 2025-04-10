import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

/**
 * Deploys Poll contract fixture for testing
 * @returns Object with contract instance and test accounts
 */
export async function deployPollFixture() {
  // Get accounts
  const [owner, voter1, voter2, voter3] = await hre.viem.getWalletClients();

  // Deploy Poll contract
  const poll = await hre.viem.deployContract("Poll");
  const publicClient = await hre.viem.getPublicClient();

  return {
    poll,
    owner,
    voter1,
    voter2,
    voter3,
    publicClient,
  };
}

/**
 * Helper to reuse the fixture with loadFixture
 */
export async function usePollFixture() {
  return await loadFixture(deployPollFixture);
} 