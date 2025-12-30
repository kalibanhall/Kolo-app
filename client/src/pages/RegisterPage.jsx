import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogoKoloFull } from '../components/LogoKolo';
import { EyeIcon, EyeOffIcon, GoogleIcon } from '../components/Icons';
import { validatePhoneNumber, formatPhoneDisplay } from '../utils/phoneValidation';
import { useFormPersistence } from '../hooks/useFormPersistence';

export const RegisterPage = () => {
  const { register, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Utiliser la persistance de formulaire
  const [formData, setFormData, clearFormData] = useFormPersistence('register', {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '', // Will store only the number part without +243
  });
  
  const [localError, setLocalError] = useState('');
  const [phoneValidation, setPhoneValidation] = useState({ valid: false, operator: null, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Valider le téléphone au chargement si déjà rempli
  useEffect(() => {
    if (formData.phone && formData.phone.length === 9) {
      const validation = validatePhoneNumber(`+243${formData.phone}`);
      setPhoneValidation(validation);
    }
  }, []);

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

    try {
      // Send full phone number with +243 prefix
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: `+243${formData.phone}`
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
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
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
                  ✓ {phoneValidation.operator}
                </p>
              )}
              {formData.phone.length === 9 && !phoneValidation.valid && (
                <p className="text-xs text-red-600 mt-1">
                  ✗ {phoneValidation.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
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

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
