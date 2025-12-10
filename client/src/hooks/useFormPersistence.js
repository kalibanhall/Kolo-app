import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour persister les données de formulaire dans sessionStorage
 * Les données sont automatiquement restaurées lors d'une actualisation
 * 
 * @param {string} key - Clé unique pour identifier le formulaire
 * @param {object} initialState - État initial du formulaire
 * @param {number} expirationMinutes - Durée de vie des données (défaut: 30 minutes)
 * @returns {[object, function, function]} - [formData, setFormData, clearFormData]
 */
export const useFormPersistence = (key, initialState, expirationMinutes = 30) => {
  const storageKey = `kolo_form_${key}`;
  
  // Fonction pour récupérer les données persistées
  const getPersistedData = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const expirationTime = expirationMinutes * 60 * 1000;
        
        // Vérifier si les données sont encore valides
        if (Date.now() - timestamp < expirationTime) {
          return data;
        } else {
          // Données expirées, les supprimer
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      sessionStorage.removeItem(storageKey);
    }
    return null;
  }, [storageKey, expirationMinutes]);
  
  // Initialiser l'état avec les données persistées ou l'état initial
  const [formData, setFormDataState] = useState(() => {
    const persisted = getPersistedData();
    return persisted || initialState;
  });
  
  // Fonction pour mettre à jour les données et les persister
  const setFormData = useCallback((newData) => {
    setFormDataState(prevData => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : newData;
      
      // Persister dans sessionStorage
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({
          data: updatedData,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Erreur lors de la persistance des données:', error);
      }
      
      return updatedData;
    });
  }, [storageKey]);
  
  // Fonction pour effacer les données persistées (après soumission réussie)
  const clearFormData = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setFormDataState(initialState);
  }, [storageKey, initialState]);
  
  // Effet pour persister les données initiales si vides
  useEffect(() => {
    const persisted = getPersistedData();
    if (!persisted) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({
          data: initialState,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Erreur lors de la persistance initiale:', error);
      }
    }
  }, [storageKey, initialState, getPersistedData]);
  
  return [formData, setFormData, clearFormData];
};

export default useFormPersistence;
