"use client";
import React from "react";

/**
 * Fetches data from the GitHub data JSON file.
 * @returns {Promise<any>} A promise that resolves to the data from the JSON file.
 */
async function fetchData() {
  // Fetch the data from the specified JSON file
  const response = await fetch("/github_data.json");
  const data = await response.json();
  return data;

}

export default function DataPage() {
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetchData().then(setData);
  }, []);

  if (!data) return <p>No data found. Please integrate GitHub first.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">GitHub Data</h2>
      <pre className=" p-4 rounded text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

