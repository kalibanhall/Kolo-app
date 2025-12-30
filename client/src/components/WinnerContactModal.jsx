import React, { useState } from 'react';

export const WinnerContactModal = ({ isOpen, winner, onClose, onContact }) => {
  const [contactMethod, setContactMethod] = useState('email');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleContact = async (e) => {
    e.preventDefault();
    setSending(true);
    setSuccess('');
    setError('');

    try {
      await onContact({
        userId: winner.user_id,
        method: contactMethod,
        message: message || null,
      });
      
      setSuccess('Contact envoyé avec succès !');
      setMessage('');
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi du contact');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !winner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Contacter le gagnant
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Winner Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <strong>Gagnant :</strong> {winner.user_name}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Email :</strong> {winner.user_email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Téléphone :</strong> {winner.user_phone || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Ticket :</strong> {winner.ticket_number}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Prix :</strong> {winner.main_prize}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleContact}>
          {/* Contact Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Méthode de contact
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={contactMethod === 'email'}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700">Email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="sms"
                  checked={contactMethod === 'sms'}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700">SMS</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="both"
                  checked={contactMethod === 'both'}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700">Email + SMS</span>
              </label>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message personnalisé (optionnel)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajoutez un message personnel pour le gagnant..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="4"
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Envoi...
                </>
              ) : (
                <>Envoyer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WinnerContactModal;
