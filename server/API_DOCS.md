# 🎯 API Documentation with Swagger

## Overview
KOLO API documentation is automatically generated using Swagger/OpenAPI 3.0 specification.

## Access Documentation

### Development
```
http://localhost:5000/api-docs
```

### Production
```
https://api.kolo.cd/api-docs
```

## Features

✅ **Interactive API Testing** - Test endpoints directly in browser
✅ **Authentication** - JWT Bearer token support
✅ **Request/Response Examples** - See sample data
✅ **Schema Validation** - Complete data models
✅ **Error Responses** - Documented error codes

## API Endpoints Overview

### 🔐 Authentication (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - User authentication
- `GET /verify-email/:token` - Email verification
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `GET /me` - Get current user profile

### 🎫 Campaigns (`/api/campaigns`)
- `GET /` - List all campaigns
- `GET /current` - Get active campaign
- `GET /:id` - Get specific campaign
- `POST /` - Create campaign (admin)
- `PUT /:id` - Update campaign (admin)
- `DELETE /:id` - Delete campaign (admin)

### 🎟️ Tickets (`/api/tickets`)
- `POST /purchase` - Purchase tickets
- `GET /my-tickets` - User's tickets
- `GET /:id` - Get specific ticket
- `GET /campaign/:campaignId` - Campaign tickets

### 💳 Payments (`/api/payments`)
- `POST /verify` - Verify Mobile Money payment
- `GET /status/:transactionId` - Payment status
- `POST /webhook` - Payment webhook

### 👑 Admin (`/api/admin`)
- `GET /users` - List all users
- `GET /dashboard` - Dashboard statistics
- `POST /draw/:campaignId` - Conduct lottery draw
- `GET /participants/:campaignId` - Campaign participants

### 👤 Users (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /change-password` - Change password

## Authentication

All protected endpoints require JWT authentication:

```http
Authorization: Bearer <your_jwt_token>
```

### Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

## Testing with Swagger UI

1. **Navigate to `/api-docs`**
2. **Click "Authorize" button** (top right)
3. **Enter**: `Bearer <your_token>`
4. **Click "Authorize"** then "Close"
5. **Select an endpoint** and click "Try it out"
6. **Fill parameters** and click "Execute"

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Schema Examples

### User Schema
```json
{
  "id": 1,
  "email": "user@example.com",
  "nom": "Doe",
  "prenom": "John",
  "telephone": "+243812345678",
  "role": "user",
  "email_verified": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Campaign Schema
```json
{
  "id": 1,
  "nom_campagne": "Villa Moderne Kinshasa",
  "description": "Belle villa avec 4 chambres",
  "prix_ticket": 1.00,
  "nombre_tickets_max": 1000,
  "nombre_tickets_vendus": 450,
  "date_debut": "2024-01-01T00:00:00Z",
  "date_fin": "2024-01-31T23:59:59Z",
  "statut": "active",
  "image_url": "/images/villa.jpg"
}
```

### Ticket Schema
```json
{
  "id": 1,
  "numero_ticket": "TKT-20240115-001",
  "campagne_id": 1,
  "utilisateur_id": 5,
  "prix_paye": 1.00,
  "date_achat": "2024-01-15T14:30:00Z",
  "statut_paiement": "completed"
}
```

## Download OpenAPI Spec

```bash
# JSON format
curl http://localhost:5000/api-docs.json > openapi.json

# Generate client SDK
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5000/api-docs.json \
  -g javascript \
  -o ./sdk
```

## Adding Documentation to New Endpoints

Add JSDoc comments to route files:

```javascript
/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
router.get('/:id', async (req, res) => {
  // Implementation
});
```

## Troubleshooting

### Swagger UI not loading
- Check `setupSwagger()` is called in `server.js`
- Verify `/api-docs` route is accessible
- Check browser console for errors

### Authentication not working
- Ensure token format is: `Bearer <token>`
- Token must be valid and not expired
- Click "Logout" then re-authorize

### Endpoints not appearing
- Check JSDoc comments syntax
- Verify file paths in `swagger.js` `apis` array
- Restart server after adding new routes

## Resources

- [Swagger Documentation](https://swagger.io/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.0)
- [Swagger Editor](https://editor.swagger.io/)
