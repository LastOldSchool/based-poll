import {
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { 
  generatePrePollId, 
  getVotersForOption 
} from "./helpers/poll-helpers";
import { usePollFixture } from "./helpers/fixtures";

describe("Poll Events", function () {
  it("Should create poll and register votes correctly", async function () {
    const { poll, voter1, publicClient } = await usePollFixture();

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

describe("Multiple Voters Test", function () {
  it("Should correctly track voters across poll options", async function () {
    // Deploy a new poll contract
    const poll = await hre.viem.deployContract("Poll");
    const publicClient = await hre.viem.getPublicClient();
    
    // Get test accounts from hardhat
    const allAccounts = await hre.viem.getWalletClients();
    
    // Keep track of which accounts have already voted
    const usedVoterAddresses = new Set<string>();
    
    // Poll data
    const question = "Which blockchain is best?";
    const options = ["Ethereum", "Base", "Optimism", "Arbitrum"];
    const optionCount = options.length; // 4 options
    const deadline = BigInt(await time.latest()) + 1000n;
    
    // Generate pre-poll ID
    const prePollId = await generatePrePollId(question, options);
    
    // Create poll
    const createTx = await poll.write.createPoll([prePollId, optionCount, deadline]);
    await publicClient.waitForTransactionReceipt({ hash: createTx });
    
    // Get actual poll ID
    const actualPollId = await poll.read.calculateActualPollId([prePollId, optionCount, deadline]);
    
    // Keep track of which voters voted for which option
    const votersByOption: Record<number, `0x${string}`[]> = {
      1: [], // Ethereum voters
      2: [], // Base voters
      3: [], // Optimism voters
      4: [], // Arbitrum voters
    };
    
    // Prepare an array for target votes per option (adjust based on accounts available)
    const targetVotesPerOption = [2, 2, 2, 2]; // 2 votes each for 4 options
    
    // Distribute votes across options
    for (let optionId = 1; optionId <= 4; optionId++) {
      const targetVotes = targetVotesPerOption[optionId - 1];
      let votesAdded = 0;
      
      for (let accountIndex = 1; accountIndex < allAccounts.length && votesAdded < targetVotes; accountIndex++) {
        const voter = allAccounts[accountIndex];
        const voterAddress = voter.account.address;
        
        // Skip if this account has already voted
        if (usedVoterAddresses.has(voterAddress)) continue;
        
        // Mark this account as used
        usedVoterAddresses.add(voterAddress);
        
        // Cast vote
        const pollAsVoter = await hre.viem.getContractAt("Poll", poll.address, {
          client: { wallet: voter },
        });
        
        const voteTx = await pollAsVoter.write.vote([
          prePollId,
          optionId,
          optionCount,
          deadline,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: voteTx });
        
        // Track the voter for this option
        votersByOption[optionId].push(voterAddress);
        votesAdded++;
      }
    }
    
    // Verify vote counts
    const pollData = await poll.read.getPoll([actualPollId]);
    
    // Verify each option has the expected vote count
    for (let optionId = 1; optionId <= 4; optionId++) {
      const expectedVotes = votersByOption[optionId].length;
      expect(pollData[1][optionId - 1]).to.equal(BigInt(expectedVotes));
    }
    
    // Get voters for each option using the helper function
    for (let optionId = 1; optionId <= 4; optionId++) {
      const fetchedVoters = await getVotersForOption(
        publicClient,
        poll.address,
        actualPollId,
        optionId
      );
      
      // Sort both arrays to ensure consistent comparison
      const expectedVoters = [...votersByOption[optionId]].sort();
      const actualVoters = [...fetchedVoters].sort();
      
      // Verify that the helper function returns the correct voters
      expect(actualVoters.length).to.equal(expectedVoters.length);
      
      for (let i = 0; i < expectedVoters.length; i++) {
        expect(actualVoters[i].toLowerCase()).to.equal(expectedVoters[i].toLowerCase());
      }
      
      // Additional check: The number of voters should match the vote count
      expect(fetchedVoters.length).to.equal(Number(pollData[1][optionId - 1]));
    }
  });
}); 