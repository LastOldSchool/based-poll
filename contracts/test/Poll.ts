import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, stringToHex, encodeAbiParameters, parseAbiParameters } from "viem";

describe("Poll Contract", function () {
  // Deploy fixture to reuse in tests
  async function deployPollFixture() {
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

  // Helper function to generate pre-poll ID (used off-chain in real scenario)
  async function generatePrePollId(question: string, options: string[]): Promise<`0x${string}`> {
    // In a real application, this would be done off-chain, but we need it for testing
    return keccak256(stringToHex(`${question}:${options.join('|')}`));
  }

  // Helper function to calculate the actual poll ID (as done in the contract)
  async function calculateActualPollId(prePollId: `0x${string}`, optionCount: number, deadline: bigint): Promise<`0x${string}`> {
    // This should match the contract's calculateActualPollId function which uses abi.encode
    return keccak256(
      encodeAbiParameters(
        parseAbiParameters("bytes32, uint8, uint256"),
        [prePollId, optionCount, deadline]
      )
    );
  }

  describe("Poll Creation", function () {
    it("Should create a poll with valid parameters", async function () {
      const { poll, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only - not stored on-chain)
      const question = "What is your favorite color?";
      const options = ["Red", "Blue", "Green"];
      const optionCount = options.length;
      const oneDay = 24 * 60 * 60;
      const deadline = BigInt(await time.latest()) + BigInt(oneDay);

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const tx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: tx });

      // Get the actual poll ID calculated by the contract
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);
      
      // Our helper should match the contract's calculation
      const expectedActualPollId = await calculateActualPollId(prePollId, optionCount, deadline);
      expect(actualPollId).to.equal(expectedActualPollId);

      // Get poll data using actual poll ID
      const pollData = await poll.read.getPoll([actualPollId]);

      // Verify poll data
      expect(pollData[0]).to.equal(deadline); // deadline
      expect(pollData[1]).to.deep.equal([0n, 0n, 0n]); // voteCounts (all zero)
      expect(pollData[2]).to.equal(optionCount); // optionCount
      expect(pollData[3]).to.equal(true); // exists
      
      // Can also get poll data using parameters
      const pollDataByParams = await poll.read.getPollByParams([prePollId, optionCount, deadline]);
      expect(pollDataByParams).to.deep.equal(pollData);
    });

    it("Should fail to create a poll with too few options", async function () {
      const { poll } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Invalid poll?";
      const options = ["Yes"]; // Only 1 option
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      await expect(
        poll.write.createPoll([prePollId, optionCount, deadline])
      ).to.be.rejectedWith("Poll must have 2-6 options");
    });

    it("Should fail to create a poll with too many options", async function () {
      const { poll } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Invalid poll?";
      const options = ["1", "2", "3", "4", "5", "6", "7"]; // 7 options
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      await expect(
        poll.write.createPoll([prePollId, optionCount, deadline])
      ).to.be.rejectedWith("Poll must have 2-6 options");
    });

    it("Should fail to create a poll with deadline in the past", async function () {
      const { poll } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Invalid poll?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) - 100n; // In the past

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      await expect(
        poll.write.createPoll([prePollId, optionCount, deadline])
      ).to.be.rejectedWith("Deadline must be in the future");
    });

    it("Should fail to create a duplicate poll", async function () {
      const { poll, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Duplicate poll?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll first time
      const tx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: tx });

      // Try to create again with same parameters (which will result in the same actual poll ID)
      await expect(
        poll.write.createPoll([prePollId, optionCount, deadline])
      ).to.be.rejectedWith("Poll already exists");
    });
  });

  describe("Poll Creation and Voting", function () {
    it("Should create a poll and allow voting with proper state changes", async function () {
      const { poll, voter1, voter2, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Full workflow test?";
      const options = ["Yes", "No", "Maybe"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 1000n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Get actual poll ID
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);

      // Verify poll was created with correct data
      const pollData = await poll.read.getPoll([actualPollId]);
      expect(pollData[0]).to.equal(deadline);
      expect(pollData[1]).to.deep.equal([0n, 0n, 0n]); // No votes yet
      expect(pollData[2]).to.equal(optionCount);
      expect(pollData[3]).to.equal(true); // exists
      
      // Vote as voter1 for option 1
      const pollAsVoter1 = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });
      const voter1Tx = await pollAsVoter1.write.vote([
        prePollId,
        1, // Vote for "Yes"
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voter1Tx });
      
      // Vote as voter2 for option 2
      const pollAsVoter2 = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter2 },
      });
      const voter2Tx = await pollAsVoter2.write.vote([
        prePollId,
        2, // Vote for "No"
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voter2Tx });
      
      // Verify votes were counted correctly
      const updatedPollData = await poll.read.getPoll([actualPollId]);
      expect(updatedPollData[1][0]).to.equal(1n); // First option has 1 vote
      expect(updatedPollData[1][1]).to.equal(1n); // Second option has 1 vote
      expect(updatedPollData[1][2]).to.equal(0n); // Third option has 0 votes
      
      // Verify individual votes
      const voter1Vote = await poll.read.checkVote([actualPollId, voter1.account.address]);
      expect(voter1Vote[0]).to.equal(true); // hasVoted
      expect(voter1Vote[1]).to.equal(1); // voted for option 1
      
      const voter2Vote = await poll.read.checkVote([actualPollId, voter2.account.address]);
      expect(voter2Vote[0]).to.equal(true); // hasVoted
      expect(voter2Vote[1]).to.equal(2); // voted for option 2
      
      // Fast forward time past deadline
      await time.increase(2000);
      
      // Verify poll has ended
      expect(await poll.read.isPollEnded([actualPollId])).to.equal(true);
      
      // Try to vote again after deadline
      await expect(
        pollAsVoter1.write.vote([
          prePollId,
          3, // Try to vote for "Maybe" now
          optionCount,
          deadline,
        ])
      ).to.be.rejectedWith("Poll has ended");
    });

    it("Should create a poll if it doesn't exist when voting", async function () {
      const { poll, voter1, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Auto-created poll?";
      const options = ["Yes", "No", "Maybe"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Calculate actual poll ID
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);

      // Verify poll doesn't exist yet
      const initialPollData = await poll.read.getPoll([actualPollId]);
      expect(initialPollData[3]).to.equal(false); // exists should be false

      // Vote as voter1, which should create the poll
      const optionId = 1; // Vote for "Yes"
      const pollContract = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });

      const voteTx = await pollContract.write.vote([
        prePollId,
        optionId,
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voteTx });

      // Verify poll was created
      const pollData = await poll.read.getPoll([actualPollId]);
      expect(pollData[3]).to.equal(true); // exists should be true
      expect(pollData[0]).to.equal(deadline);
      expect(pollData[2]).to.equal(optionCount);

      // Verify vote was counted
      expect(pollData[1][optionId - 1]).to.equal(1n);
    });

    it("Should prevent voting twice on the same poll", async function () {
      const { poll, voter1, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Double vote test?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Vote as voter1
      const pollContract = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });

      const voteTx = await pollContract.write.vote([
        prePollId,
        1, // Vote for "Yes"
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voteTx });

      // Try to vote again
      await expect(
        pollContract.write.vote([
          prePollId,
          2, // Try to vote for "No" now
          optionCount,
          deadline,
        ])
      ).to.be.rejectedWith("Already voted");
    });

    it("Should prevent voting after the deadline", async function () {
      const { poll, voter1, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Expired poll test?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Fast forward time past the deadline
      await time.increase(200);

      // Try to vote as voter1
      const pollContract = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });

      await expect(
        pollContract.write.vote([
          prePollId,
          1,
          optionCount,
          deadline,
        ])
      ).to.be.rejectedWith("Poll has ended");
    });

    it("Should prevent voting with invalid option ID", async function () {
      const { poll, voter1, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Invalid option test?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Try to vote with invalid option ID
      const pollContract = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });

      // Option ID 0 (too low)
      await expect(
        pollContract.write.vote([
          prePollId,
          0,
          optionCount,
          deadline,
        ])
      ).to.be.rejectedWith("Invalid option ID");

      // Option ID 3 (too high)
      await expect(
        pollContract.write.vote([
          prePollId,
          3,
          optionCount,
          deadline,
        ])
      ).to.be.rejectedWith("Invalid option ID");
    });
  });

  describe("Poll Query Functions", function () {
    it("Should correctly report poll status", async function () {
      const { poll, voter1, voter2, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Status test?";
      const options = ["Option A", "Option B"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Get actual poll ID
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);

      // Check if poll has ended (should be false)
      expect(await poll.read.isPollEnded([actualPollId])).to.equal(false);

      // Vote as voter1
      const pollAsVoter1 = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });
      const voter1Tx = await pollAsVoter1.write.vote([
        prePollId,
        1,
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voter1Tx });

      // Vote as voter2
      const pollAsVoter2 = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter2 },
      });
      const voter2Tx = await pollAsVoter2.write.vote([
        prePollId,
        2,
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voter2Tx });

      // Check vote counts
      const pollData = await poll.read.getPoll([actualPollId]);
      expect(pollData[1][0]).to.equal(1n); // First option has 1 vote
      expect(pollData[1][1]).to.equal(1n); // Second option has 1 vote

      // Check individual votes
      let voteInfo = await poll.read.checkVote([actualPollId, voter1.account.address]);
      expect(voteInfo[0]).to.equal(true);
      expect(voteInfo[1]).to.equal(1);

      voteInfo = await poll.read.checkVote([actualPollId, voter2.account.address]);
      expect(voteInfo[0]).to.equal(true);
      expect(voteInfo[1]).to.equal(2);

      // Fast forward time past the deadline
      await time.increase(200);

      // Check if poll has ended (should be true)
      expect(await poll.read.isPollEnded([actualPollId])).to.equal(true);
    });

    it("Should correctly handle non-existent polls", async function () {
      const { poll } = await loadFixture(deployPollFixture);

      // Generate a random poll ID
      const nonExistentPollId = "0x1234567890123456789012345678901234567890123456789012345678901234";
      
      // Check poll data
      const pollData = await poll.read.getPoll([nonExistentPollId]);
      expect(pollData[3]).to.equal(false); // exists should be false
      expect(pollData[0]).to.equal(0n); // zero deadline
      expect(pollData[1].length).to.equal(0); // empty voteCounts array
      
      // Check if poll has ended (should be false for non-existent poll)
      expect(await poll.read.isPollEnded([nonExistentPollId])).to.equal(false);
    });
    
    it("Should query poll information using both direct ID and parameters", async function () {
      const { poll, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Query test?";
      const options = ["Yes", "No", "Maybe"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Get actual poll ID
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);
      
      // Query using direct ID
      const dataById = await poll.read.getPoll([actualPollId]);
      
      // Query using parameters
      const dataByParams = await poll.read.getPollByParams([prePollId, optionCount, deadline]);
      
      // Both should return the same data
      expect(dataByParams).to.deep.equal(dataById);
    });
  });

  describe("Events", function () {
    it("Should create poll and register votes correctly", async function () {
      const { poll, voter1, publicClient } = await loadFixture(deployPollFixture);

      // Poll data (for test reference only)
      const question = "Combined event test?";
      const options = ["Yes", "No"];
      const optionCount = options.length;
      const deadline = BigInt(await time.latest()) + 100n;

      // Generate pre-poll ID
      const prePollId = await generatePrePollId(question, options);

      // Create poll and verify it exists
      const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Get actual poll ID
      const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);
      
      // Verify poll exists
      const pollData = await poll.read.getPoll([actualPollId]);
      expect(pollData[3]).to.equal(true);
      
      // Vote and verify vote count changes
      const pollAsVoter1 = await hre.viem.getContractAt("Poll", poll.address, {
        client: { wallet: voter1 },
      });
      
      const voteTx = await pollAsVoter1.write.vote([
        prePollId,
        1, // Vote for first option
        optionCount,
        deadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voteTx });
      
      // Verify vote was counted
      const updatedPollData = await poll.read.getPoll([actualPollId]);
      expect(updatedPollData[1][0]).to.equal(1n); // First option has 1 vote
      
      // Verify voter's vote was recorded
      const voteInfo = await poll.read.checkVote([actualPollId, voter1.account.address]);
      expect(voteInfo[0]).to.equal(true); // hasVoted
      expect(voteInfo[1]).to.equal(1); // voted for option 1
    });
  });
}); 