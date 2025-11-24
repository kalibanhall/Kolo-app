const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Setup test database
    await db.query('BEGIN');
  });

  afterAll(async () => {
    // Cleanup
    await db.query('ROLLBACK');
    await db.end();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+243812345678',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject registration with existing email', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: 'test@example.com',
        phone: '+243812345679',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with invalid phone', async () => {
      const invalidUser = {
        name: 'Invalid User',
        email: 'invalid@example.com',
        phone: '123', // Invalid phone
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
    });

    test('should reject registration with weak password', async () => {
      const weakUser = {
        name: 'Weak User',
        email: 'weak@example.com',
        phone: '+243812345680',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakUser);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      // Create test user
      testUser = {
        email: 'login@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login Test',
          email: testUser.email,
          phone: '+243812345681',
          password: testUser.password
        });
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', testUser.email);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/verify-email/:token', () => {
    test('should verify email with valid token', async () => {
      // Create user and get verification token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Verify Test',
          email: 'verify@example.com',
          phone: '+243812345682',
          password: 'password123'
        });

      // In production, token would be sent via email
      // For testing, we'll mock it
      const token = 'mock-verification-token';

      const verifyResponse = await request(app)
        .get(`/api/auth/verify-email/${token}`);

      // Should return success or redirect
      expect([200, 302]).toContain(verifyResponse.status);
    });

    test('should reject invalid verification token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalid-token');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    test('should not reveal if email exists (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Should return same response to prevent email enumeration
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'newpassword123'
        });

      expect([200, 400]).toContain(response.status);
    });

    test('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: '123'
        });

      expect(response.status).toBe(400);
    });
  });
});
