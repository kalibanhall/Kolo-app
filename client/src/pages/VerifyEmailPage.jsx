import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LogoKolo } from '../components/LogoKolo';

export const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-email/${token}`
      );

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email vérifié ! Vous pouvez maintenant vous connecter.' } 
          });
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Erreur de connexion au serveur');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-gray-900/80 border-b border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-cyan-400 hover:bg-gray-800 transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour</span>
          </button>
          
          <LogoKolo size="small" />
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-gray-800/50 border border-gray-700 backdrop-blur-sm rounded-2xl p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              Vérification Email
            </h2>
          </div>

          {/* Status */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500 mb-4"></div>
              <p className="text-gray-400">Vérification de votre email en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 border border-green-700 mb-4">
                <svg
                  className="h-10 w-10 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">Email Vérifié !</h3>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirection vers la connexion dans 3 secondes...</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                Aller à la connexion maintenant →
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/30 border border-red-700 mb-4">
                <svg
                  className="h-10 w-10 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">Erreur</h3>
              <p className="text-gray-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl transition font-medium"
                >
                  Retour à la connexion
                </Link>
                <Link
                  to="/resend-verification"
                  className="block w-full bg-gray-700 text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-600 transition font-medium"
                >
                  Renvoyer l'email de vérification
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
