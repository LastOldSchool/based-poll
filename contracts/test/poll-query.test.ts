import {
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { generatePrePollId } from "./helpers/poll-helpers";
import { usePollFixture } from "./helpers/fixtures";

describe("Poll Query Functions", function () {
  it("Should correctly report poll status", async function () {
    const { poll, voter1, voter2, publicClient } = await usePollFixture();

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
    const { poll } = await usePollFixture();

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
    const { poll, publicClient } = await usePollFixture();

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