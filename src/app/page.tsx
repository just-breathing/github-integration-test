"use client";
import React from "react";

export default function GitHubIntegration() {
  const handleConnect = () => {
    window.open("/api/integrations/github/authorize", "_blank");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">GitHub Integration</h2>
      <button
        onClick={handleConnect}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Connect GitHub
      </button>
    </div>
  );
}