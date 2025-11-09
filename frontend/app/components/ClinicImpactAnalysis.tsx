'use client';

import { Clinic } from '../types';
import { ImpactAnalysis, GAIARecommendation } from '../utils/villageAnalysis';

interface ClinicImpactAnalysisProps {
  clinic: Clinic;
  impact: ImpactAnalysis;
  gaiaRecommendations: GAIARecommendation[];
  onAddGAIALocation: (rec: GAIARecommendation) => void;
}

export default function ClinicImpactAnalysis({
  clinic,
  impact,
  gaiaRecommendations,
  onAddGAIALocation,
}: ClinicImpactAnalysisProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-black mb-2">Impact Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">
          Impact of removing <span className="font-semibold">{clinic.name}</span>
        </p>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium mb-1">Affected Villages</div>
          <div className="text-2xl font-bold text-red-800">{impact.affectedVillageCount}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium mb-1">Affected Population</div>
          <div className="text-2xl font-bold text-red-800">
            {impact.totalAffectedPopulation.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Affected Villages List */}
      {impact.affectedVillages.length > 0 && (
        <div>
          <h4 className="font-semibold text-black mb-3">Affected Villages</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {impact.affectedVillages.slice(0, 10).map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div>
                  <span className="font-medium text-black">{item.village.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({item.distance.toFixed(1)} km)
                  </span>
                </div>
                <div className="text-gray-700 font-medium">
                  ~{item.population.toLocaleString()} people
                </div>
              </div>
            ))}
            {impact.affectedVillages.length > 10 && (
              <div className="text-sm text-gray-500 text-center py-2">
                + {impact.affectedVillages.length - 10} more villages
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAIA MHC Recommendations */}
      {gaiaRecommendations.length > 0 && (
        <div>
          <h4 className="font-semibold text-black mb-3">
            Recommended GAIA MHC Locations (5 stops)
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            If converting to GAIA Mobile Health Clinic, these locations would maximize coverage:
          </p>
          <div className="space-y-3">
            {gaiaRecommendations.map((rec, index) => (
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
                      <h5 className="font-semibold text-black">{rec.villageName}</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Villages covered: </span>
                        <span className="font-semibold text-black">
                          {rec.villagesCovered.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Population: </span>
                        <span className="font-semibold text-black">
                          {rec.totalPopulationCovered.toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Coordinates: </span>
                        <span className="font-mono text-xs text-black">
                          {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    {rec.villagesCovered.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-amber-700 hover:text-amber-800">
                            View covered villages ({rec.villagesCovered.length})
                          </summary>
                          <div className="mt-2 pl-4 space-y-1 max-h-32 overflow-y-auto">
                            {rec.villagesCovered.slice(0, 10).map((village, idx) => (
                              <div key={idx} className="text-gray-600">
                                • {village.name}
                              </div>
                            ))}
                            {rec.villagesCovered.length > 10 && (
                              <div className="text-gray-500">
                                + {rec.villagesCovered.length - 10} more
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onAddGAIALocation(rec)}
                    className="ml-4 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium whitespace-nowrap"
                  >
                    Add Location
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {impact.affectedVillages.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p>No villages would be affected by removing this clinic.</p>
          <p className="text-sm mt-2">Other clinics provide coverage in this area.</p>
        </div>
      )}
    </div>
  );
}

