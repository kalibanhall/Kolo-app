const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Campaigns API', () => {
  beforeAll(async () => {
    await db.query('BEGIN');
  });

  afterAll(async () => {
    await db.query('ROLLBACK');
    await db.end();
  });

  describe('GET /api/campaigns/current', () => {
    test('should get current active campaign', async () => {
      // Create active campaign
      await db.query(
        `INSERT INTO campaigns (title, description, main_prize, ticket_price, total_tickets, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Current Campaign', 'Active now', 'Prize', 1.00, 100, 'open']
      );

      const response = await request(app)
        .get('/api/campaigns/current');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('open');
    });

    test('should return 404 if no active campaign', async () => {
      // Close all campaigns
      await db.query(`UPDATE campaigns SET status = 'closed'`);

      const response = await request(app)
        .get('/api/campaigns/current');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    let campaignId;

    beforeAll(async () => {
      const result = await db.query(
        `INSERT INTO campaigns (title, description, main_prize, ticket_price, total_tickets, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Detail Campaign', 'Details test', 'Prize', 1.00, 100, 'open']
      );
      campaignId = result.rows[0].id;
    });

    test('should get campaign details', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${campaignId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('ticket_price');
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/campaigns', () => {
    test('should list all campaigns', async () => {
      const response = await request(app)
        .get('/api/campaigns');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter campaigns by status', async () => {
      const response = await request(app)
        .get('/api/campaigns?status=open');

      expect(response.status).toBe(200);
      response.body.forEach(campaign => {
        expect(campaign.status).toBe('open');
      });
    });
  });
});
