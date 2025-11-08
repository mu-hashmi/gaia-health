'use client';

import { Clinic } from '../types';

interface ClinicListProps {
  clinics: Clinic[];
  onRemove: (id: string) => void;
}

export default function ClinicList({ clinics, onRemove }: ClinicListProps) {
  const getClinicTypeColor = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'bg-green-100 text-green-800 border-green-300';
      case 'govt': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cham': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-black border-gray-300';
    }
  };

  const clinicsByType = {
    gaia: clinics.filter(c => c.type === 'gaia'),
    govt: clinics.filter(c => c.type === 'govt'),
    cham: clinics.filter(c => c.type === 'cham'),
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-black mb-4">Clinics</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-black mb-2">
            GAIA Clinics ({clinicsByType.gaia.length})
          </h3>
          <div className="space-y-2">
            {clinicsByType.gaia.map(clinic => (
              <div
                key={clinic.id}
                className="flex items-center justify-between p-3 border border-green-300 rounded-lg bg-green-50"
              >
                <span className="font-medium text-black">{clinic.name}</span>
                <button
                  onClick={() => onRemove(clinic.id)}
                  className="text-red-600 hover:text-red-800 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-black mb-2">
            Government Clinics ({clinicsByType.govt.length})
          </h3>
          <div className="space-y-2">
            {clinicsByType.govt.map(clinic => (
              <div
                key={clinic.id}
                className="flex items-center justify-between p-3 border border-blue-300 rounded-lg bg-blue-50"
              >
                <span className="font-medium text-black">{clinic.name}</span>
                <button
                  onClick={() => onRemove(clinic.id)}
                  className="text-red-600 hover:text-red-800 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-black mb-2">
            CHAM Clinics ({clinicsByType.cham.length})
          </h3>
          <div className="space-y-2">
            {clinicsByType.cham.map(clinic => (
              <div
                key={clinic.id}
                className="flex items-center justify-between p-3 border border-purple-300 rounded-lg bg-purple-50"
              >
                <span className="font-medium text-black">{clinic.name}</span>
                <button
                  onClick={() => onRemove(clinic.id)}
                  className="text-red-600 hover:text-red-800 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-black">
          <strong>Tip:</strong> Click on the map to add a new clinic at that location.
        </p>
      </div>
    </div>
  );
}

