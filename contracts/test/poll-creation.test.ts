import {
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { 
  generatePrePollId, 
  calculateActualPollId
} from "./helpers/poll-helpers";
import { usePollFixture } from "./helpers/fixtures";

describe("Poll Creation", function () {
  it("Should create a poll with valid parameters", async function () {
    const { poll, publicClient } = await usePollFixture();

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
    const { poll } = await usePollFixture();

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
    const { poll } = await usePollFixture();

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
    const { poll } = await usePollFixture();

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
    const { poll, publicClient } = await usePollFixture();

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