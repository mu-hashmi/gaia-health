'use client';

import { useState, useEffect } from 'react';
import { ClinicType } from '../types';

interface AddClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: ClinicType, lat: number, lng: number) => void;
  lat: number;
  lng: number;
}

export default function AddClinicModal({
  isOpen,
  onClose,
  onAdd,
  lat,
  lng,
}: AddClinicModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ClinicType>('gaia');

  // Handle Escape key to close modal
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), type, lat, lng);
      setName('');
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative" 
        style={{ zIndex: 10001 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-black mb-4">Add New Clinic</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Clinic Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-400"
              placeholder="Enter clinic name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Clinic Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ClinicType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
              <option value="gaia" className="text-black">GAIA</option>
              <option value="govt" className="text-black">Government</option>
              <option value="healthcentre" className="text-black">Health Centre</option>
              <option value="other" className="text-black">Other</option>
            </select>
          </div>

          <div className="text-sm text-black">
            <p>Location: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Clinic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

