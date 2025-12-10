import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogoKolo } from '../components/LogoKolo';
import { EyeIcon, EyeOffIcon, GoogleIcon } from '../components/Icons';

export const LoginPage = () => {
  const { login, loginWithGoogle, loading, error, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    try {
      const response = await login(formData.email, formData.password);

      // Use context helper to determine admin status (more reliable)
      console.debug('Login response:', response);
      if (isAdmin()) {
        navigate('/admin');
      } else {
        // Rediriger les clients vers l'accueil après connexion
        navigate('/');
      }
    } catch (err) {
      setLocalError(err.message || 'Email ou mot de passe incorrect');
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setGoogleLoading(true);
    
    try {
      await loginWithGoogle();
      
      if (isAdmin()) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setLocalError(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="mb-4">
              <LogoKolo size="large" animated />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 hover:text-blue-600 transition-colors">KOLO</h1>
          </Link>
          <p className="text-gray-600 mt-2">Tombola</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-gray-600 mb-6">
            Connectez-vous pour accéder à votre compte
          </p>

          {(error || localError) && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{localError || error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
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
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
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
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
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

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors"
            >
              <GoogleIcon className="w-5 h-5" />
              {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                S'inscrire
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
