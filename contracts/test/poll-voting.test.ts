import {
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { generatePrePollId } from "./helpers/poll-helpers";
import { usePollFixture } from "./helpers/fixtures";

describe("Poll Creation and Voting", function () {
  it("Should create a poll and allow voting with proper state changes", async function () {
    const { poll, voter1, voter2, publicClient } = await usePollFixture();

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
    const { poll, voter1, publicClient } = await usePollFixture();

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
    const { poll, voter1, publicClient } = await usePollFixture();

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
    const { poll, voter1, publicClient } = await usePollFixture();

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
    const { poll, voter1, publicClient } = await usePollFixture();

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