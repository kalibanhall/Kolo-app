import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { CheckIcon } from '../components/Icons';
import api from '../services/api';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/contact', formData);
      
      if (response.data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        }, 5000);
      }
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contactez-nous</h1>
          <p className="text-xl text-gray-600">
            Notre équipe est à votre écoute pour répondre à toutes vos questions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulaire de Contact */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Envoyez-nous un message</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-green-800 font-semibold">Message envoyé avec succès !</p>
                <p className="text-green-600 text-sm mt-2">Nous vous répondrons dans les plus brefs délais.</p>
              </div>
            ) : (
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre nom"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+243 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sujet *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="question">Question générale</option>
                    <option value="support">Support technique</option>
                    <option value="payment">Problème de paiement</option>
                    <option value="win">Question sur un gain</option>
                    <option value="partnership">Partenariat</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Décrivez votre demande..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer le message'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Informations de Contact */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Nos Coordonnées</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Adresse</p>
                  <p className="text-gray-600">
                    Avenue de la Libération<br />
                    Kinshasa, République Démocratique du Congo
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Email</p>
                  <p className="text-blue-600">contact@kolo.cd</p>
                  <p className="text-blue-600">support@kolo.cd</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Téléphone</p>
                  <p className="text-gray-600">+243 XXX XXX XXX</p>
                  <p className="text-gray-600">+243 XXX XXX XXX</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Horaires</p>
                  <p className="text-gray-600">
                    Lundi - Vendredi: 8h00 - 18h00<br />
                    Samedi: 9h00 - 14h00<br />
                    Dimanche: Fermé
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Support Urgent ?</h3>
              <p className="text-gray-700 text-sm mb-4">
                Pour toute question urgente concernant un paiement ou un tirage en cours, 
                contactez notre support prioritaire :
              </p>
              <p className="text-blue-600 font-semibold">
                WhatsApp: +243 XXX XXX XXX
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Disponible 24/7 pour les urgences
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">Réseaux Sociaux</h3>
              <p className="text-gray-700 text-sm mb-4">
                Suivez-nous pour rester informé des nouvelles campagnes et des gagnants !
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">📘 Facebook: @KoloCongo</p>
                <p className="text-gray-700">📷 Instagram: @kolo_cd</p>
                <p className="text-gray-700">🐦 Twitter: @KoloCongo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
