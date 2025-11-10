import React, { createContext, useContext, useState, useEffect } from 'react';
import { campaignsAPI } from '../services/api';

const CampaignContext = createContext(null);

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger la campagne active au montage
  useEffect(() => {
    loadCurrentCampaign();
  }, []);

  const loadCurrentCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsAPI.getCurrent();
      setCurrentCampaign(response.data);
    } catch (err) {
      console.error('Failed to load current campaign:', err);
      setError(err.message);
      setCurrentCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshCampaign = async () => {
    await loadCurrentCampaign();
  };

  const updateCampaignStats = (updates) => {
    if (currentCampaign) {
      setCurrentCampaign({
        ...currentCampaign,
        ...updates
      });
    }
  };

  const value = {
    currentCampaign,
    loading,
    error,
    refreshCampaign,
    updateCampaignStats,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
