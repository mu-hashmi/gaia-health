'use client';

import { RecommendedLocation } from '../utils/recommendations';
import { Clinic } from '../types';

interface RecommendationsProps {
  recommendations: RecommendedLocation[];
  onAddRecommended: (rec: RecommendedLocation) => void;
  clinics: Clinic[];
}

export default function Recommendations({ recommendations, onAddRecommended, clinics }: RecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-black mb-4">Recommended Clinic Locations</h2>
        <p className="text-black">Click "Generate Recommendations" to see optimal clinic locations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-black mb-4">Recommended Clinic Locations</h2>
      <p className="text-sm text-black mb-4">
        Based on population density and distance to existing clinics
      </p>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="border border-amber-200 rounded-lg p-4 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-black">Location #{index + 1}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-black">Score: </span>
                    <span className="font-semibold text-amber-700">
                      {(rec.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-black">Uncovered: </span>
                    <span className="font-semibold text-black">
                      {rec.uncoveredPopulation.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-black">Distance to nearest: </span>
                    <span className="font-semibold text-black">
                      {rec.distanceToNearestClinic.toFixed(1)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-black">Coordinates: </span>
                    <span className="font-mono text-xs text-black">
                      {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onAddRecommended(rec)}
                className="ml-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium whitespace-nowrap"
              >
                Add Clinic
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

