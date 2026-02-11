/**
 * Service de géolocalisation pour KOLO
 * Détecte la position de l'utilisateur via GPS et/ou IP
 */

// Provinces de la RDC avec leurs coordonnées approximatives
const DRC_PROVINCES = {
  'Kinshasa': { lat: -4.4419, lng: 15.2663, cities: ['Kinshasa'] },
  'Kongo-Central': { lat: -5.8518, lng: 13.0449, cities: ['Matadi', 'Boma', 'Mbanza-Ngungu'] },
  'Kwango': { lat: -6.1933, lng: 17.0428, cities: ['Kenge'] },
  'Kwilu': { lat: -5.0328, lng: 18.8199, cities: ['Kikwit', 'Bandundu'] },
  'Mai-Ndombe': { lat: -2.5, lng: 18.5, cities: ['Inongo'] },
  'Équateur': { lat: 0.0, lng: 18.2603, cities: ['Mbandaka'] },
  'Sud-Ubangi': { lat: 2.7683, lng: 18.5931, cities: ['Gemena'] },
  'Nord-Ubangi': { lat: 3.6522, lng: 19.8017, cities: ['Gbadolite'] },
  'Mongala': { lat: 2.0, lng: 21.5, cities: ['Lisala'] },
  'Tshuapa': { lat: -0.5, lng: 22.5, cities: ['Boende'] },
  'Tshopo': { lat: 0.5153, lng: 25.1950, cities: ['Kisangani'] },
  'Bas-Uélé': { lat: 3.0, lng: 25.0, cities: ['Buta'] },
  'Haut-Uélé': { lat: 3.9239, lng: 29.1343, cities: ['Isiro'] },
  'Ituri': { lat: 1.6611, lng: 30.4997, cities: ['Bunia'] },
  'Nord-Kivu': { lat: -1.6785, lng: 29.2285, cities: ['Goma', 'Butembo', 'Beni'] },
  'Sud-Kivu': { lat: -2.5083, lng: 28.8608, cities: ['Bukavu', 'Uvira'] },
  'Maniema': { lat: -2.9178, lng: 25.9231, cities: ['Kindu'] },
  'Sankuru': { lat: -3.5, lng: 23.5, cities: ['Lusambo'] },
  'Kasaï-Oriental': { lat: -6.1506, lng: 23.6015, cities: ['Mbuji-Mayi'] },
  'Kasaï-Central': { lat: -5.8962, lng: 22.4166, cities: ['Kananga'] },
  'Kasaï': { lat: -6.2, lng: 20.8, cities: ['Tshikapa'] },
  'Lomami': { lat: -5.0, lng: 24.5, cities: ['Kabinda'] },
  'Lualaba': { lat: -10.7167, lng: 25.4667, cities: ['Kolwezi'] },
  'Haut-Katanga': { lat: -11.6647, lng: 27.4794, cities: ['Lubumbashi', 'Likasi'] },
  'Haut-Lomami': { lat: -8.0, lng: 26.0, cities: ['Kamina'] },
  'Tanganyika': { lat: -6.1167, lng: 29.1833, cities: ['Kalemie'] },
};

// Liste complète des villes de la RDC
export const DRC_CITIES = [
  'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani',
  'Bukavu', 'Goma', 'Likasi', 'Kolwezi', 'Tshikapa',
  'Kikwit', 'Matadi', 'Uvira', 'Butembo', 'Beni',
  'Mbandaka', 'Kalemie', 'Bandundu', 'Boma', 'Kindu',
  'Isiro', 'Bunia', 'Gemena', 'Gbadolite', 'Kamina',
  'Kabinda', 'Lisala', 'Inongo', 'Kenge', 'Autre'
];

/**
 * Obtenir la province à partir de la ville
 */
export const getProvinceFromCity = (cityName) => {
  for (const [province, data] of Object.entries(DRC_PROVINCES)) {
    if (data.cities.some(city => city.toLowerCase() === cityName?.toLowerCase())) {
      return province;
    }
  }
  return null;
};

/**
 * Trouver la ville la plus proche basée sur les coordonnées
 */
export const findNearestCity = (lat, lng) => {
  let nearestCity = null;
  let nearestProvince = null;
  let minDistance = Infinity;

  for (const [province, data] of Object.entries(DRC_PROVINCES)) {
    const distance = calculateDistance(lat, lng, data.lat, data.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = data.cities[0]; // Première ville (chef-lieu)
      nearestProvince = province;
    }
  }

  return { city: nearestCity, province: nearestProvince, distance: minDistance };
};

/**
 * Calculer la distance entre deux points (Haversine formula)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Obtenir la position GPS de l'utilisateur
 */
export const getGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée par ce navigateur'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const nearestLocation = findNearestCity(latitude, longitude);
        
        resolve({
          success: true,
          method: 'gps',
          latitude,
          longitude,
          accuracy,
          city: nearestLocation.city,
          province: nearestLocation.province,
          distance: nearestLocation.distance
        });
      },
      (error) => {
        let message = 'Erreur de géolocalisation';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Position non disponible';
            break;
          case error.TIMEOUT:
            message = 'Délai de géolocalisation dépassé';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  });
};

/**
 * Obtenir la localisation par IP (fallback)
 */
export const getIPLocation = async () => {
  try {
    // Utiliser un service gratuit de géolocalisation par IP
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Service de localisation IP non disponible');
    }
    
    const data = await response.json();
    
    // Vérifier si c'est en RDC
    if (data.country_code === 'CD') {
      // Essayer de trouver la ville correspondante - priorité aux correspondances exactes
      let matchedCity = null;
      
      if (data.city) {
        const ipCity = data.city.toLowerCase().trim();
        
        // 1. Correspondance exacte (insensible à la casse)
        matchedCity = DRC_CITIES.find(city => 
          city.toLowerCase() === ipCity
        );
        
        // 2. Si pas de correspondance exacte, essayer la correspondance partielle
        //    mais seulement si la ville IP contient le nom complet de la ville DRC
        if (!matchedCity) {
          matchedCity = DRC_CITIES.find(city => 
            ipCity.includes(city.toLowerCase()) && city.length >= 3
          );
        }
      }
      
      // 3. Si toujours pas trouvé et qu'on a les coordonnées, trouver la ville la plus proche
      if (!matchedCity && data.latitude && data.longitude) {
        const nearest = findNearestCity(data.latitude, data.longitude);
        // Utiliser seulement si la distance est raisonnable (< 150 km)
        if (nearest && nearest.distance < 150) {
          matchedCity = nearest.city;
        }
      }
      
      return {
        success: true,
        method: 'ip',
        city: matchedCity || null, // Ne pas forcer une ville si on n'est pas sûr
        province: data.region,
        country: 'RDC',
        countryCode: data.country_code,
        ip: data.ip,
        latitude: data.latitude,
        longitude: data.longitude,
        autoDetected: !!matchedCity
      };
    }
    
    return {
      success: true,
      method: 'ip',
      city: data.city,
      province: data.region,
      country: data.country_name,
      countryCode: data.country_code,
      ip: data.ip,
      latitude: data.latitude,
      longitude: data.longitude,
      isInternational: true
    };
  } catch (error) {
    console.error('Erreur localisation IP:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtenir la localisation de l'utilisateur (GPS prioritaire, IP fallback)
 */
export const getUserLocation = async (preferGPS = true) => {
  if (preferGPS) {
    try {
      const gpsLocation = await getGPSLocation();
      return gpsLocation;
    } catch (gpsError) {
      console.log('GPS non disponible, tentative IP...', gpsError.message);
      // Fallback to IP
      return await getIPLocation();
    }
  }
  return await getIPLocation();
};

/**
 * Hook personnalisé pour la géolocalisation
 */
export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const detectLocation = async (preferGPS = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserLocation(preferGPS);
      setLocation(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, detectLocation };
};

// Import useState pour le hook (doit être importé dans le composant qui utilise le hook)
import { useState } from 'react';

export default {
  DRC_CITIES,
  DRC_PROVINCES,
  getGPSLocation,
  getIPLocation,
  getUserLocation,
  getProvinceFromCity,
  findNearestCity,
  useGeolocation
};
