import React from 'react';

export default function Header() {
  return (
    <header className="h-16 bg-blue-900 text-white flex items-center px-6 justify-between">
      <h1 className="text-xl font-bold">SPOTSight: NextEra Operator Dashboard</h1>
      <div>
        <span className="font-semibold">Mission Confidence:</span> <span className="text-green-400">92%</span>
      </div>
    </header>
  );
}
