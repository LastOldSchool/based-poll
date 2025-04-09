"use client";

import { useState } from "react";
import WalletConnect from "../components/WalletConnect";
import CreatePollForm from "../components/poll/CreatePollForm";
import PollCard from "../components/poll/PollCard";
import Footer from "../components/Footer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"vote" | "create">("vote");

  // Sample poll data (in a real app this would come from contract)
  const samplePoll = {
    id: "0x1234567890abcdef",
    question: "What is your favorite Base chain DApp?",
    options: [
      "Decentralized Exchange",
      "NFT Marketplace",
      "DeFi Protocol",
      "Social Media",
      "Gaming",
    ],
    deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
    voteCounts: [42, 27, 35, 18, 10],
    optionCount: 5,
    exists: true,
  };

  return (
    <main className="flex min-h-screen flex-col bg-base-light dark:bg-base-dark">
      <header className="sticky top-0 backdrop-blur-md bg-white/70 dark:bg-base-dark/70 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-base-blue">
              <span className="text-base-purple">Based</span>Poll
            </h1>
            <div className="md:hidden">
              <WalletConnect />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2 md:mr-6">
              <button
                onClick={() => setActiveTab("vote")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "vote"
                    ? "bg-blue-100 dark:bg-blue-950/30 text-base-blue"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Vote
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "create"
                    ? "bg-purple-100 dark:bg-purple-950/30 text-base-purple"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Create Poll
              </button>
            </div>
            
            <div className="hidden md:block">
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        {activeTab === "vote" ? (
          <div className="max-w-lg mx-auto">
            <PollCard poll={samplePoll} voteResult={{ hasVoted: false, optionId: 0 }} />
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <CreatePollForm />
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
