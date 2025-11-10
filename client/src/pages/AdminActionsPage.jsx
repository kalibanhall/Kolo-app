import React, { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { adminAPI } from '../services/api';

export const AdminActionsPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleExportParticipants = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await adminAPI.exportParticipants();
      
      // Créer un lien de téléchargement
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage({ type: 'success', text: 'Export réussi !' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportTickets = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await adminAPI.exportTickets();
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage({ type: 'success', text: 'Export réussi !' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await adminAPI.generateReport();
      
      setMessage({ 
        type: 'success', 
        text: 'Rapport généré avec succès !',
        details: response.data
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const ActionCard = ({ icon, title, description, action, buttonText, variant = 'primary' }) => {
    const colors = {
      primary: 'bg-indigo-600 hover:bg-indigo-700',
      success: 'bg-green-600 hover:bg-green-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700',
      danger: 'bg-red-600 hover:bg-red-700'
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-start space-x-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
            <button
              onClick={action}
              disabled={loading}
              className={`${colors[variant]} text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actions Administratives</h1>
          <p className="text-gray-600 mt-2">
            Gérez les opérations critiques de la plateforme
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-medium">{message.text}</p>
            {message.details && (
              <pre className="mt-2 text-sm bg-white p-2 rounded">
                {JSON.stringify(message.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <ActionCard
            icon="📤"
            title="Exporter les participants"
            description="Téléchargez la liste complète des participants au format CSV pour analyse externe."
            action={handleExportParticipants}
            buttonText="Exporter CSV"
            variant="primary"
          />

          <ActionCard
            icon="🎟️"
            title="Exporter les tickets"
            description="Téléchargez tous les tickets vendus avec leurs détails au format CSV."
            action={handleExportTickets}
            buttonText="Exporter Tickets"
            variant="primary"
          />

          <ActionCard
            icon="📊"
            title="Générer un rapport"
            description="Créez un rapport détaillé des statistiques de la plateforme (revenus, participants, ventes)."
            action={handleGenerateReport}
            buttonText="Générer Rapport"
            variant="success"
          />

          <ActionCard
            icon="📧"
            title="Message groupé"
            description="Envoyez un email à tous les participants ou à une sélection ciblée."
            action={() => setMessage({ type: 'error', text: 'Fonctionnalité en développement' })}
            buttonText="Envoyer Message"
            variant="warning"
          />

          <ActionCard
            icon="🔒"
            title="Verrouiller campagne"
            description="Fermez d'urgence une campagne en cours pour suspendre les ventes."
            action={() => setMessage({ type: 'error', text: 'Fonctionnalité en développement' })}
            buttonText="Verrouiller"
            variant="danger"
          />

          <ActionCard
            icon="🗃️"
            title="Archiver campagne"
            description="Déplacez une campagne terminée vers les archives pour nettoyer l'interface."
            action={() => setMessage({ type: 'error', text: 'Fonctionnalité en développement' })}
            buttonText="Archiver"
            variant="warning"
          />
        </div>

        {/* Informations de sécurité */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            ⚠️ Zone d'actions critiques
          </h3>
          <p className="text-yellow-800">
            Toutes les actions effectuées sur cette page sont enregistrées dans le journal d'audit.
            Assurez-vous de comprendre les implications avant d'exécuter une action.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminActionsPage;
