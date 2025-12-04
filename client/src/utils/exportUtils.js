import Papa from 'papaparse';

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional array of column keys to include
 */
export const exportToCSV = (data, filename, columns = null) => {
  try {
    // Filter columns if specified
    let exportData = data;
    if (columns && columns.length > 0) {
      exportData = data.map((row) => {
        const filtered = {};
        columns.forEach((col) => {
          filtered[col] = row[col];
        });
        return filtered;
      });
    }

    // Convert to CSV
    const csv = Papa.unparse(exportData, {
      quotes: true,
      header: true,
    });

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return false;
  }
};

/**
 * Export data to Excel-compatible CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Object} columnMapping - Object mapping data keys to display names
 */
export const exportToExcel = (data, filename, columnMapping = null) => {
  try {
    // Apply column mapping if provided
    let exportData = data;
    if (columnMapping) {
      exportData = data.map((row) => {
        const mapped = {};
        Object.entries(columnMapping).forEach(([key, displayName]) => {
          mapped[displayName] = row[key];
        });
        return mapped;
      });
    }

    // Convert to CSV with Excel-friendly format
    const csv = Papa.unparse(exportData, {
      quotes: true,
      header: true,
      delimiter: ',',
    });

    // Create blob with BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

/**
 * Export participants data
 */
export const exportParticipants = (participants) => {
  const columnMapping = {
    id: 'ID',
    full_name: 'Nom complet',
    email: 'Email',
    phone: 'Téléphone',
    tickets_purchased: 'Tickets achetés',
    total_spent: 'Total dépensé (USD)',
    created_at: 'Date d\'inscription',
  };

  return exportToExcel(participants, 'participants', columnMapping);
};

/**
 * Export campaigns data
 */
export const exportCampaigns = (campaigns) => {
  const columnMapping = {
    id: 'ID',
    title: 'Titre',
    status: 'Statut',
    ticket_price: 'Prix du ticket (USD)',
    total_tickets: 'Total tickets',
    sold_tickets: 'Tickets achetés',
    main_prize: 'Prix principal',
    start_date: 'Date début',
    end_date: 'Date fin',
    draw_date: 'Date tirage',
    created_at: 'Créé le',
  };

  return exportToExcel(campaigns, 'campagnes', columnMapping);
};

/**
 * Export tickets/sales data
 */
export const exportTickets = (tickets) => {
  const columnMapping = {
    id: 'ID',
    ticket_number: 'Numéro de ticket',
    user_name: 'Nom de l\'acheteur',
    user_email: 'Email',
    user_phone: 'Téléphone',
    campaign_title: 'Campagne',
    price: 'Prix (USD)',
    status: 'Statut',
    is_winner: 'Gagnant',
    purchased_at: 'Date d\'achat',
  };

  return exportToExcel(tickets, 'tickets', columnMapping);
};

/**
 * Export transactions/payments data
 */
export const exportTransactions = (transactions) => {
  const columnMapping = {
    id: 'ID',
    user_name: 'Utilisateur',
    user_email: 'Email',
    campaign_title: 'Campagne',
    amount: 'Montant (USD)',
    payment_method: 'Méthode de paiement',
    transaction_id: 'ID Transaction',
    status: 'Statut',
    created_at: 'Date',
  };

  return exportToExcel(transactions, 'transactions', columnMapping);
};

/**
 * Export winners data
 */
export const exportWinners = (winners) => {
  const columnMapping = {
    id: 'ID',
    ticket_number: 'Numéro de ticket',
    user_name: 'Nom du gagnant',
    user_email: 'Email',
    user_phone: 'Téléphone',
    campaign_title: 'Campagne',
    prize: 'Prix',
    prize_type: 'Type de prix',
    draw_date: 'Date du tirage',
    notified: 'Notifié',
    claimed: 'Réclamé',
  };

  return exportToExcel(winners, 'gagnants', columnMapping);
};

/**
 * Format date for export
 */
export const formatDateForExport = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format boolean for export (Oui/Non in French)
 */
export const formatBooleanForExport = (value) => {
  return value ? 'Oui' : 'Non';
};

/**
 * Export button component helper
 */
export const getExportButtonProps = (onClick, loading = false) => ({
  onClick,
  disabled: loading,
  className: `inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium ${
    loading ? 'opacity-50 cursor-not-allowed' : ''
  }`,
  children: loading ? (
    <>
      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Export en cours...
    </>
  ) : (
    <>
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Exporter CSV
    </>
  ),
});

export default {
  exportToCSV,
  exportToExcel,
  exportParticipants,
  exportCampaigns,
  exportTickets,
  exportTransactions,
  exportWinners,
  formatDateForExport,
  formatBooleanForExport,
  getExportButtonProps,
};
