const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Tickets API', () => {
  let authToken;
  let userId;
  let campaignId;

  beforeAll(async () => {
    await db.query('BEGIN');

    // Create test user and get token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ticket Test User',
        email: 'tickets@example.com',
        phone: '+243812345690',
        password: 'password123'
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Create test campaign
    const campaignResponse = await db.query(
      `INSERT INTO campaigns (title, description, main_prize, ticket_price, total_tickets, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Test Campaign', 'Test Description', 'Test Prize', 1.00, 100, 'open']
    );
    campaignId = campaignResponse.rows[0].id;
  });

  afterAll(async () => {
    await db.query('ROLLBACK');
    await db.end();
  });

  describe('POST /api/tickets/purchase', () => {
    test('should purchase tickets successfully', async () => {
      const purchaseData = {
        campaign_id: campaignId,
        ticket_count: 3,
        phone_number: '+243812345690'
      };

      const response = await request(app)
        .post('/api/tickets/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactionId');
    });

    test('should reject purchase without authentication', async () => {
      const response = await request(app)
        .post('/api/tickets/purchase')
        .send({
          campaign_id: campaignId,
          ticket_count: 2,
          phone_number: '+243812345690'
        });

      expect(response.status).toBe(401);
    });

    test('should reject purchase with count > 5', async () => {
      const response = await request(app)
        .post('/api/tickets/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignId,
          ticket_count: 10, // Exceeds limit
          phone_number: '+243812345690'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/maximum/i);
    });

    test('should reject purchase with count < 1', async () => {
      const response = await request(app)
        .post('/api/tickets/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignId,
          ticket_count: 0,
          phone_number: '+243812345690'
        });

      expect(response.status).toBe(400);
    });

    test('should reject purchase with invalid phone', async () => {
      const response = await request(app)
        .post('/api/tickets/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: campaignId,
          ticket_count: 2,
          phone_number: '123' // Invalid
        });

      expect(response.status).toBe(400);
    });

    test('should reject purchase for non-existent campaign', async () => {
      const response = await request(app)
        .post('/api/tickets/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaign_id: 99999,
          ticket_count: 2,
          phone_number: '+243812345690'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tickets/my-tickets', () => {
    test('should get user tickets', async () => {
      const response = await request(app)
        .get('/api/tickets/my-tickets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tickets');
      expect(Array.isArray(response.body.tickets)).toBe(true);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/tickets/my-tickets');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tickets/:id', () => {
    let ticketId;

    beforeAll(async () => {
      // Create a ticket for testing
      const result = await db.query(
        `INSERT INTO tickets (campaign_id, user_id, ticket_number, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [campaignId, userId, 'KL-12345-ABCDE', 'active']
      );
      ticketId = result.rows[0].id;
    });

    test('should get ticket details', async () => {
      const response = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ticket_number');
    });

    test('should reject access to other user ticket', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Other User',
          email: 'other@example.com',
          phone: '+243812345691',
          password: 'password123'
        });

      const otherToken = otherUserResponse.body.token;

      const response = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });
});
