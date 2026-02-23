import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { LogoKolo } from '../components/LogoKolo';
import { Footer } from '../components/Footer';
import api from '../services/api';

export const UserInvoicesPage = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.payments.getInvoices({ limit: 50 });
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoice) => {
    try {
      setDownloading({ ...downloading, [invoice.id]: true });

      // If PDF URL exists, download directly from Cloudinary
      if (invoice.pdf_url) {
        const link = document.createElement('a');
        link.href = invoice.pdf_url;
        link.download = `KOLO_Facture_${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback: try to get PDF from server
        const response = await api.get(`/payments/invoices/${invoice.id}/pdf`, {
          responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `KOLO_Facture_${invoice.invoice_number}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Erreur lors du téléchargement de la facture');
    } finally {
      setDownloading({ ...downloading, [invoice.id]: false });
    }
  };

  const handleView = async (invoice) => {
    try {
      if (invoice.pdf_url) {
        window.open(invoice.pdf_url, '_blank');
      } else {
        alert('Le PDF de cette facture n\'est pas encore disponible. Veuillez réessayer plus tard.');
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      alert('Erreur lors de l\'ouverture de la facture');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    const labels = {
      completed: 'Payée',
      pending: 'En attente',
      failed: 'Échouée',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header with back button */}
      <header className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
              isDarkMode 
                ? 'text-cyan-400 hover:bg-gray-800' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour</span>
          </button>
          
          <div className="flex items-center gap-3">
            <LogoKolo size="small" />
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mes Factures
            </h1>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="flex-grow max-w-7xl mx-auto px-4 py-8 sm:py-12 w-full">
        {/* Subtitle */}
        <div className="mb-8">
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Consultez et téléchargez toutes vos factures d'achats de tickets
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`rounded-2xl shadow-md p-6 ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total factures</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{invoices.length}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl shadow-md p-6 ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Factures payées</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {invoices.length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>OK</span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl shadow-md p-6 ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total dépensé</p>
                {(() => {
                  const usdTotal = invoices.filter(i => i.purchase_currency === 'USD' || (!i.purchase_currency && parseFloat(i.amount) < 100)).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                  const cdfTotal = invoices.filter(i => i.purchase_currency === 'CDF' || (!i.purchase_currency && parseFloat(i.amount) >= 100)).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                  return (
                    <>
                      {usdTotal > 0 && <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>${usdTotal.toFixed(2)}</p>}
                      {cdfTotal > 0 && <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{new Intl.NumberFormat('fr-FR').format(cdfTotal)} FC</p>}
                      {usdTotal === 0 && cdfTotal === 0 && <p className={`text-3xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>$0.00</p>}
                    </>
                  );
                })()}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className={`rounded-2xl shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white'}`}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Chargement des factures...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <svg className={`w-10 h-10 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Aucune facture</h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Vous n'avez pas encore effectué d'achats de tickets
              </p>
              <a
                href="/campaigns"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Voir les campagnes
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      N° Facture
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Campagne
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Montant
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Statut
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className={isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {invoice.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{invoice.campaign_title}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {invoice.ticket_count} ticket{invoice.ticket_count > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {(invoice.purchase_currency === 'CDF' || (!invoice.purchase_currency && parseFloat(invoice.amount) >= 100))
                            ? `${new Intl.NumberFormat('fr-FR').format(parseFloat(invoice.amount))} FC`
                            : `$${parseFloat(invoice.amount).toFixed(2)}`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                          Payée
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(invoice)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Voir
                          </button>
                          <button
                            onClick={() => handleDownload(invoice)}
                            disabled={downloading[invoice.id]}
                            className={`flex items-center gap-1 ${
                              downloading[invoice.id]
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {downloading[invoice.id] ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                PDF
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserInvoicesPage;
