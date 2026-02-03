/**
 * Ticket Number Generator Utility
 * Ensures unique ticket numbers across concurrent purchases
 */

/**
 * Generate unique ticket numbers for a purchase
 * Uses database-level uniqueness checking with retry logic
 * 
 * @param {object} client - PostgreSQL transaction client
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - User ID
 * @param {number} purchaseId - Purchase ID
 * @param {number} ticketCount - Number of tickets to generate
 * @returns {Promise<Array>} - Array of created ticket records
 */
async function generateTickets(client, campaignId, userId, purchaseId, ticketCount) {
  // Get campaign info with lock
  const campaignResult = await client.query(
    `SELECT id, total_tickets, sold_tickets, ticket_prefix, status 
     FROM campaigns 
     WHERE id = $1 
     FOR UPDATE`,
    [campaignId]
  );

  if (campaignResult.rows.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const campaign = campaignResult.rows[0];
  
  // Check if campaign is still open
  if (campaign.status !== 'open') {
    throw new Error(`Campaign ${campaignId} is not open for purchases`);
  }
  
  // Check availability
  const remainingTickets = campaign.total_tickets - campaign.sold_tickets;
  if (ticketCount > remainingTickets) {
    throw new Error(`Not enough tickets available. Requested: ${ticketCount}, Available: ${remainingTickets}`);
  }

  const ticketPrefix = campaign.ticket_prefix || 'X';
  const padLength = Math.max(2, String(campaign.total_tickets).length);

  // Get all existing ticket numbers for this campaign to avoid duplicates
  const existingResult = await client.query(
    `SELECT ticket_number FROM tickets WHERE campaign_id = $1`,
    [campaignId]
  );
  const existingNumbers = new Set(existingResult.rows.map(r => r.ticket_number));

  // Also check reserved tickets (not yet purchased)
  const reservedResult = await client.query(
    `SELECT ticket_number FROM ticket_reservations 
     WHERE campaign_id = $1 
       AND status = 'reserved' 
       AND expires_at > CURRENT_TIMESTAMP
       AND user_id != $2`,
    [campaignId, userId]
  );
  reservedResult.rows.forEach(r => existingNumbers.add(r.ticket_number));

  const tickets = [];
  let attempts = 0;
  const maxAttempts = campaign.total_tickets; // Limité au nombre total de tickets

  // Générer les numéros de tickets uniquement dans la plage valide (1 à total_tickets)
  for (let currentNumber = 1; currentNumber <= campaign.total_tickets && tickets.length < ticketCount; currentNumber++) {
    const ticketNumber = `K${ticketPrefix}-${String(currentNumber).padStart(padLength, '0')}`;
    
    if (!existingNumbers.has(ticketNumber)) {
      try {
        const ticketResult = await client.query(
          `INSERT INTO tickets (ticket_number, campaign_id, user_id, purchase_id, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT (ticket_number, campaign_id) DO NOTHING
           RETURNING *`,
          [ticketNumber, campaignId, userId, purchaseId]
        );

        if (ticketResult.rows.length > 0) {
          tickets.push(ticketResult.rows[0]);
          existingNumbers.add(ticketNumber);
          console.log(`✅ Created ticket ${ticketNumber} for user ${userId}`);
        }
      } catch (err) {
        // If duplicate key error, just continue to next number
        if (err.code === '23505') {
          console.log(`⚠️ Ticket ${ticketNumber} already exists, trying next`);
        } else {
          throw err;
        }
      }
    }
    
    attempts++;
  }

  if (tickets.length < ticketCount) {
    throw new Error(`Could not generate all tickets. Generated: ${tickets.length}, Requested: ${ticketCount}`);
  }

  // Update campaign sold_tickets
  await client.query(
    `UPDATE campaigns 
     SET sold_tickets = sold_tickets + $1 
     WHERE id = $2`,
    [ticketCount, campaignId]
  );

  // Check if campaign is now sold out
  const updatedCampaign = await client.query(
    `SELECT sold_tickets, total_tickets, status FROM campaigns WHERE id = $1`,
    [campaignId]
  );
  
  if (updatedCampaign.rows[0].sold_tickets >= updatedCampaign.rows[0].total_tickets &&
      updatedCampaign.rows[0].status === 'open') {
    await client.query(
      `UPDATE campaigns SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [campaignId]
    );
    console.log(`🎯 Campaign ${campaignId} automatically closed - all tickets sold!`);
  }

  return tickets;
}

/**
 * Get available ticket numbers for a campaign
 * @param {object} queryFn - Database query function
 * @param {number} campaignId - Campaign ID
 * @param {number} userId - Current user ID (optional, to exclude their own reservations)
 * @param {number} limit - Maximum numbers to return
 * @returns {Promise<Array>} - Array of available ticket numbers
 */
async function getAvailableNumbers(queryFn, campaignId, userId, limit = 10000) {
  // Get campaign info
  const campaignResult = await queryFn(
    'SELECT id, total_tickets, sold_tickets, ticket_prefix FROM campaigns WHERE id = $1',
    [campaignId]
  );
  
  if (campaignResult.rows.length === 0) {
    throw new Error('Campaign not found');
  }
  
  const campaign = campaignResult.rows[0];
  const ticketPrefix = campaign.ticket_prefix || 'X';
  const padLength = Math.max(2, String(campaign.total_tickets).length);
  
  // Get used ticket numbers
  const usedResult = await queryFn(
    'SELECT ticket_number FROM tickets WHERE campaign_id = $1',
    [campaignId]
  );
  
  // Get reserved tickets (excluding current user)
  const reservedQuery = userId
    ? `SELECT ticket_number FROM ticket_reservations 
       WHERE campaign_id = $1 AND status = 'reserved' AND expires_at > CURRENT_TIMESTAMP AND user_id != $2`
    : `SELECT ticket_number FROM ticket_reservations 
       WHERE campaign_id = $1 AND status = 'reserved' AND expires_at > CURRENT_TIMESTAMP`;
  
  const reservedResult = userId
    ? await queryFn(reservedQuery, [campaignId, userId])
    : await queryFn(reservedQuery, [campaignId]);
  
  const usedNumbers = new Set([
    ...usedResult.rows.map(r => r.ticket_number),
    ...reservedResult.rows.map(r => r.ticket_number)
  ]);
  
  // Generate available numbers
  const availableNumbers = [];
  for (let i = 1; i <= campaign.total_tickets && availableNumbers.length < limit; i++) {
    const ticketNumber = `K${ticketPrefix}-${String(i).padStart(padLength, '0')}`;
    if (!usedNumbers.has(ticketNumber)) {
      availableNumbers.push({
        number: i,
        display: ticketNumber
      });
    }
  }
  
  return {
    numbers: availableNumbers,
    total_available: campaign.total_tickets - campaign.sold_tickets,
    reserved_count: reservedResult.rows.length,
    actual_available: availableNumbers.length,
    total_tickets: campaign.total_tickets,
    padLength,
    ticket_prefix: ticketPrefix,
    limited: availableNumbers.length >= limit
  };
}

module.exports = {
  generateTickets,
  getAvailableNumbers
};
