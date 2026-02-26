import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogoKoloFull } from '../components/LogoKolo';
import { EyeIcon, EyeOffIcon, GoogleIcon, LocationIcon } from '../components/Icons';
import { validatePhoneNumber, formatPhoneDisplay } from '../utils/phoneValidation';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { DRC_CITIES, getUserLocation, getProvinceFromCity } from '../services/geolocationService';

export const RegisterPage = () => {
  const { register, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  
  // Liste des villes de la RDC (importée du service)
  const drcCities = DRC_CITIES;

  // Utiliser la persistance de formulaire
  const [formData, setFormData, clearFormData] = useFormPersistence('register', {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '', // Will store only the number part without +243
    city: '', // Ville de résidence
    date_of_birth: '', // Date de naissance pour vérifier l'âge
  });
  
  const [localError, setLocalError] = useState('');
  const errorRef = useRef(null);
  const [phoneValidation, setPhoneValidation] = useState({ valid: false, operator: null, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { executeRecaptcha, isReady: recaptchaReady } = useRecaptcha();
  
  // Scroll vers l'erreur quand elle apparaît
  useEffect(() => {
    if ((localError || error) && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [localError, error]);

  // Valider le téléphone au chargement si déjà rempli
  useEffect(() => {
    if (formData.phone && formData.phone.length === 9) {
      const validation = validatePhoneNumber(`+243${formData.phone}`);
      setPhoneValidation(validation);
    }
  }, []);

  // Détecter automatiquement la localisation au chargement
  useEffect(() => {
    if (!formData.city) {
      detectUserLocation();
    }
  }, []);

  // Fonction pour détecter la localisation
  const detectUserLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getUserLocation(false); // IP d'abord (moins intrusif)
      
      if (location.success && location.city) {
        // Vérifier si la ville est dans notre liste (correspondance exacte uniquement)
        const matchedCity = drcCities.find(city => 
          city.toLowerCase() === location.city?.toLowerCase()
        );
        
        if (matchedCity) {
          setFormData(prev => ({ ...prev, city: matchedCity }));
          setLocationDetected(true);
        }
      }
    } catch (err) {
      console.log('Localisation automatique non disponible:', err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  // Détecter par GPS (plus précis, demande permission)
  const detectByGPS = async () => {
    setLocationLoading(true);
    try {
      const location = await getUserLocation(true); // GPS prioritaire
      
      if (location.success && location.city) {
        const matchedCity = drcCities.find(city => 
          city.toLowerCase() === location.city?.toLowerCase() ||
          location.city?.toLowerCase().includes(city.toLowerCase())
        );
        
        if (matchedCity) {
          setFormData(prev => ({ ...prev, city: matchedCity }));
          setLocationDetected(true);
        }
      }
    } catch (err) {
      setLocalError('Impossible de détecter votre position. Veuillez sélectionner manuellement.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setLocalError('');
  };

  const handlePhoneChange = (e) => {
    // Only allow numbers and limit to 9 digits after +243
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setFormData(prev => ({
      ...prev,
      phone: value,
    }));
    
    // Valider le numéro si complet
    if (value.length === 9) {
      const validation = validatePhoneNumber(`+243${value}`);
      setPhoneValidation(validation);
    } else {
      setPhoneValidation({ valid: false, operator: null, message: '' });
    }
    
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (formData.password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.phone.length !== 9) {
      setLocalError('Le numéro de téléphone doit contenir 9 chiffres');
      return;
    }
    
    // Valider le numéro avec les opérateurs
    const validation = validatePhoneNumber(`+243${formData.phone}`);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    // Vérifier que la date de naissance est fournie
    if (!formData.date_of_birth) {
      setLocalError('Veuillez entrer votre date de naissance');
      return;
    }

    // Vérifier l'âge (minimum 18 ans)
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      setLocalError('Vous devez avoir au moins 18 ans pour participer à la tombola');
      return;
    }
    // Vérifier l'acceptation des CGU
    if (!acceptedTerms) {
      setLocalError('Vous devez accepter les conditions générales d\'utilisation');
      return;
    }

    // Obtenir le token reCAPTCHA
    let recaptchaToken = null;
    if (recaptchaReady) {
      recaptchaToken = await executeRecaptcha('register');
      if (!recaptchaToken) {
        setLocalError('Vérification de sécurité échouée. Veuillez réessayer.');
        return;
      }
    }

    try {
      // Send full phone number with +243 prefix
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: `+243${formData.phone}`,
        city: formData.city,
        date_of_birth: formData.date_of_birth,
        recaptchaToken,
      });
      // Effacer les données persistées après inscription réussie
      clearFormData();
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <LogoKoloFull size="large" darkMode={true} animated />
          </Link>
          <p className="text-gray-400 mt-4">Plateforme de Tombola en ligne</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inscription</h2>
          <p className="text-gray-600 mb-6">
            Créez votre compte pour participer
          </p>

          {(error || localError) && (
            <div ref={errorRef} className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{localError || error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kabila Mwamba"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium">
                  +243
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  maxLength="9"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="812345678"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vodacom (M-Pesa), Airtel, Orange, Africell
              </p>
              {phoneValidation.operator && (
                <p className="text-xs text-green-600 mt-1">
                  <span className="text-green-500">Opérateur: {phoneValidation.operator}</span>
                </p>
              )}
              {formData.phone.length === 9 && !phoneValidation.valid && (
                <p className="text-xs text-red-600 mt-1">
                  <span className="text-red-500">{phoneValidation.message}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville de résidence *
              </label>
              <div className="flex gap-2">
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Sélectionnez votre ville</option>
                  {drcCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={detectByGPS}
                  disabled={locationLoading}
                  className="px-3 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Détecter ma position"
                >
                  {locationLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {locationDetected && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Position détectée automatiquement
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Principales villes de la RDC • Cliquez 📍 pour détecter
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de naissance *
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous devez avoir au moins 18 ans pour participer
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none text-xs font-medium"
                >
                  {showConfirmPassword ? 'Cacher' : 'Voir'}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* Accepter les termes et conditions */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600 cursor-pointer">
                J'accepte les{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  conditions générales d'utilisation
                </Link>
                {' '}et la politique de confidentialité de KOLO.
              </label>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !acceptedTerms}
              className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                acceptedTerms 
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={async () => {
                setLocalError('');
                setGoogleLoading(true);
                try {
                  await loginWithGoogle();
                  navigate('/');
                } catch (err) {
                  setLocalError(err.message || 'Erreur lors de l\'inscription Google');
                } finally {
                  setGoogleLoading(false);
                }
              }}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors"
            >
              <GoogleIcon className="w-5 h-5" />
              {googleLoading ? 'Connexion...' : 'S\'inscrire avec Google'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Déjà inscrit ?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};
