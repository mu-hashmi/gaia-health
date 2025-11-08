'use client';

import { CoverageStats as CoverageStatsType } from '../types';

interface CoverageStatsProps {
  stats: CoverageStatsType;
  previousStats?: CoverageStatsType;
}

export default function CoverageStats({ stats, previousStats }: CoverageStatsProps) {
  const populationChange = previousStats
    ? stats.coveredPopulation - previousStats.coveredPopulation
    : 0;
  const coverageChange = previousStats
    ? stats.coveragePercentage - previousStats.coveragePercentage
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-black mb-4">Coverage Statistics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-black">Total Population</div>
          <div className="text-2xl font-bold text-blue-700">
            {stats.totalPopulation.toLocaleString()}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-black">Covered Population</div>
          <div className="text-2xl font-bold text-green-700">
            {stats.coveredPopulation.toLocaleString()}
            {populationChange !== 0 && (
              <span className={`text-sm ml-2 ${populationChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({populationChange > 0 ? '+' : ''}{populationChange.toLocaleString()})
              </span>
            )}
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-black">Uncovered Population</div>
          <div className="text-2xl font-bold text-red-700">
            {stats.uncoveredPopulation.toLocaleString()}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-black">Coverage Percentage</div>
          <div className="text-2xl font-bold text-purple-700">
            {stats.coveragePercentage.toFixed(1)}%
            {coverageChange !== 0 && (
              <span className={`text-sm ml-2 ${coverageChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({coverageChange > 0 ? '+' : ''}{coverageChange.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {populationChange !== 0 && (
        <div className={`mt-4 p-3 rounded-lg ${populationChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <strong>
            {populationChange > 0 ? 'Gained' : 'Lost'} coverage for{' '}
            {Math.abs(populationChange).toLocaleString()} people
          </strong>
        </div>
      )}
    </div>
  );
}

