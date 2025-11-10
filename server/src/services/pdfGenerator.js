const PDFDocument = require('pdfkit');
const { query } = require('../config/database');

/**
 * Génère une facture PDF pour un achat
 * @param {number} purchaseId - ID de l'achat
 * @returns {Promise<PDFDocument>} - Document PDF
 */
async function generateInvoicePDF(purchaseId) {
  // Récupérer les données de l'achat
  const purchaseResult = await query(
    `SELECT p.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
            c.title as campaign_title, c.main_prize,
            i.invoice_number, i.sent_at,
            array_agg(t.ticket_number) as ticket_numbers
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     JOIN campaigns c ON p.campaign_id = c.id
     LEFT JOIN invoices i ON i.purchase_id = p.id
     LEFT JOIN tickets t ON t.purchase_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.name, u.email, u.phone, c.title, c.main_prize, i.invoice_number, i.sent_at`,
    [purchaseId]
  );

  if (purchaseResult.rows.length === 0) {
    throw new Error('Purchase not found');
  }

  const purchase = purchaseResult.rows[0];

  // Créer le document PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // En-tête
  doc
    .fontSize(20)
    .fillColor('#4f46e5')
    .text('KOLO', 50, 50, { bold: true })
    .fontSize(10)
    .fillColor('#6b7280')
    .text('Tombola Digitale - RDC', 50, 75);

  // Titre de la facture
  doc
    .fontSize(24)
    .fillColor('#111827')
    .text('FACTURE', 350, 50, { align: 'right' });

  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text(`N° ${purchase.invoice_number || 'N/A'}`, 350, 75, { align: 'right' })
    .text(`Date: ${new Date(purchase.created_at).toLocaleDateString('fr-FR')}`, 350, 90, { align: 'right' });

  // Ligne de séparation
  doc
    .moveTo(50, 120)
    .lineTo(550, 120)
    .stroke('#e5e7eb');

  // Informations client
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('FACTURÉ À', 50, 140)
    .fontSize(10)
    .fillColor('#6b7280')
    .text(purchase.user_name, 50, 160)
    .text(purchase.user_email, 50, 175)
    .text(purchase.user_phone, 50, 190);

  // Informations campagne
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('CAMPAGNE', 350, 140)
    .fontSize(10)
    .fillColor('#6b7280')
    .text(purchase.campaign_title, 350, 160)
    .text(purchase.main_prize, 350, 175);

  // Tableau des tickets
  const tableTop = 250;
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('DÉTAILS DE L\'ACHAT', 50, tableTop);

  // En-têtes du tableau
  const headerY = tableTop + 30;
  doc
    .fontSize(10)
    .fillColor('#ffffff')
    .rect(50, headerY, 500, 25)
    .fill('#4f46e5');

  doc
    .fillColor('#ffffff')
    .text('Description', 60, headerY + 8)
    .text('Quantité', 300, headerY + 8)
    .text('Prix unitaire', 380, headerY + 8)
    .text('Total', 480, headerY + 8);

  // Ligne du produit
  const rowY = headerY + 30;
  doc
    .fillColor('#111827')
    .text('Tickets de tombola', 60, rowY)
    .text(purchase.ticket_count.toString(), 300, rowY)
    .text(`${purchase.total_amount / purchase.ticket_count} $`, 380, rowY)
    .text(`${purchase.total_amount} $`, 480, rowY);

  // Ligne de séparation
  doc
    .moveTo(50, rowY + 25)
    .lineTo(550, rowY + 25)
    .stroke('#e5e7eb');

  // Total
  const totalY = rowY + 40;
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('TOTAL', 400, totalY, { bold: true })
    .fontSize(14)
    .fillColor('#4f46e5')
    .text(`${purchase.total_amount} $`, 480, totalY, { bold: true });

  // Numéros de tickets
  const ticketsY = totalY + 60;
  doc
    .fontSize(12)
    .fillColor('#111827')
    .text('VOS NUMÉROS DE TICKETS', 50, ticketsY);

  if (purchase.ticket_numbers && purchase.ticket_numbers.length > 0) {
    let y = ticketsY + 25;
    purchase.ticket_numbers.forEach((ticketNumber, index) => {
      if (index > 0 && index % 5 === 0) {
        y += 20;
      }
      const x = 50 + (index % 5) * 100;
      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(ticketNumber, x, y);
    });
  }

  // Pied de page
  const footerY = 750;
  doc
    .fontSize(9)
    .fillColor('#9ca3af')
    .text('Merci de votre participation !', 50, footerY, { align: 'center', width: 500 })
    .text('KOLO - Tombola Digitale', 50, footerY + 15, { align: 'center', width: 500 })
    .text('contact@kolo.cd | +243 841 209 627', 50, footerY + 30, { align: 'center', width: 500 });

  doc.end();

  return doc;
}

module.exports = { generateInvoicePDF };
