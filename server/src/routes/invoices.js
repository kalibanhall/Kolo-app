const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const router = express.Router();

// Get user invoices
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Users can only see their own invoices unless they're admin
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await query(
      `SELECT i.*, p.total_amount, p.ticket_count, c.title as campaign_title
       FROM invoices i
       JOIN purchases p ON i.purchase_id = p.id
       JOIN campaigns c ON p.campaign_id = c.id
       WHERE i.user_id = $1
       ORDER BY i.sent_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get user invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Download invoice PDF
router.get('/:invoiceId/pdf', verifyToken, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    
    // Get invoice details
    const invoiceResult = await query(
      `SELECT i.*, p.user_id
       FROM invoices i
       JOIN purchases p ON i.purchase_id = p.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    // Check authorization
    if (req.user.id !== invoice.user_id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate PDF
    const pdfDoc = await generateInvoicePDF(invoice.purchase_id);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.invoice_number}.pdf"`);

    // Pipe PDF to response
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('Download invoice PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating PDF'
    });
  }
});

// Get invoice by purchase ID
router.get('/purchase/:purchaseId', verifyToken, async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.purchaseId);
    
    const result = await query(
      `SELECT i.*, p.user_id
       FROM invoices i
       JOIN purchases p ON i.purchase_id = p.id
       WHERE i.purchase_id = $1`,
      [purchaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = result.rows[0];

    // Check authorization
    if (req.user.id !== invoice.user_id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice by purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
