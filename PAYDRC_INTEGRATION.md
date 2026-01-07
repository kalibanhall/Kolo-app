# PayDRC (MOKO Afrika) Integration Guide

## Overview

KOLO is integrated with the PayDRC payment gateway (MOKO Afrika) for Mobile Money payments in DRC. This allows customers to pay using:

- **Vodacom M-Pesa** (081, 082, 083)
- **Airtel Money** (097, 099)
- **Orange Money** (084, 085, 089)
- **Africell** (090, 091)

## API Endpoints

### 1. Initiate Payment (PayIn/C2B)

```
POST /api/payments/paydrc/initiate
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "campaign_id": 1,
  "ticket_count": 2,
  "phone_number": "0972148867"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Paiement initié. Veuillez valider sur votre téléphone.",
  "data": {
    "purchase_id": 123,
    "reference": "KOLO-1704567890-ABC123",
    "paydrc_transaction_id": "PDABXKT031fD08M9PfR24C14",
    "status": "pending",
    "status_label": "En attente de validation",
    "amount": 200,
    "currency": "CDF",
    "provider": "airtel",
    "ticket_count": 2
  }
}
```

### 2. Check Payment Status

```
GET /api/payments/paydrc/status/:reference
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reference": "KOLO-1704567890-ABC123",
    "status": "completed",
    "paydrc_status": "Successful",
    "amount": 200,
    "ticket_count": 2,
    "campaign_title": "Grande Tombola 2026"
  }
}
```

### 3. Callback Endpoint (PayDRC → KOLO)

```
POST /api/payments/paydrc/callback
```

This endpoint receives encrypted callback notifications from PayDRC when a transaction status changes.

**Security:**
- AES-256-CBC encryption for payload
- HMAC-SHA256 signature verification (X-Signature header)

## Environment Configuration

Add these variables to your `.env` file:

```bash
# PayDRC (MOKO Afrika) - Production
PAYDRC_BASE_URL=https://paydrc.gofreshbakery.net/api/v5/
PAYDRC_MERCHANT_ID=j*zL/#%lkq(EbSNhb
PAYDRC_MERCHANT_SECRET=your-merchant-secret-from-dashboard

# Callback encryption keys (obtain from PayDRC support)
PAYDRC_AES_KEY=xxxxxxxxxxxxxxxx
PAYDRC_HMAC_KEY=xxxxxxxxxxxxxxxx

# Your public API URL for callbacks
API_URL=https://kolo-api.onrender.com
```

## Transaction Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │      │  KOLO API   │      │   PayDRC    │      │  Mobile     │
│   (React)   │      │  (Express)  │      │   Gateway   │      │  Operator   │
└─────┬───────┘      └─────┬───────┘      └─────┬───────┘      └─────┬───────┘
      │                    │                    │                    │
      │ 1. POST /paydrc/initiate               │                    │
      │─────────────────────>│                  │                    │
      │                    │                    │                    │
      │                    │ 2. POST /api/v5/  │                    │
      │                    │   (action: debit) │                    │
      │                    │───────────────────>│                    │
      │                    │                    │                    │
      │                    │ 3. Transaction_id │                    │
      │                    │<───────────────────│                    │
      │                    │                    │                    │
      │ 4. {reference,     │                    │                    │
      │    status:pending} │                    │ 5. USSD Push      │
      │<─────────────────────                   │───────────────────>│
      │                    │                    │                    │
      │                    │                    │ 6. User confirms   │
      │                    │                    │<───────────────────│
      │                    │                    │                    │
      │                    │ 7. Encrypted       │                    │
      │                    │    Callback        │                    │
      │                    │<───────────────────│                    │
      │                    │                    │                    │
      │                    │ 8. Decrypt, verify,│                    │
      │                    │    generate tickets│                    │
      │                    │    send SMS/email  │                    │
      │                    │                    │                    │
      │ 9. User polls      │                    │                    │
      │    /paydrc/status  │                    │                    │
      │─────────────────────>│                  │                    │
      │                    │                    │                    │
      │ 10. {status:       │                    │                    │
      │     completed}     │                    │                    │
      │<─────────────────────                   │                    │
      │                    │                    │                    │
```

## Status Mapping

| PayDRC Status | KOLO Status | Description |
|---------------|-------------|-------------|
| Success | pending | Initial acknowledgment, waiting for processing |
| Submitted | pending | Transaction submitted to operator |
| Pending | pending | Awaiting customer confirmation |
| Successful | completed | Payment confirmed, tickets generated |
| Failed | failed | Transaction failed |

## Supported Networks

| Prefix | Operator | method parameter |
|--------|----------|------------------|
| 081, 082, 083 | Vodacom M-Pesa | `vodacom` |
| 097, 099 | Airtel Money | `airtel` |
| 084, 085, 089 | Orange Money | `orange` |
| 090, 091 | Africell | `africell` |

## Error Handling

Common error responses:

```json
{
  "success": false,
  "message": "Échec de l'initiation du paiement",
  "error": "Insufficient balance"
}
```

## Testing

### Test with cURL

```bash
# 1. Login to get token
curl -X POST https://kolo-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Initiate payment
curl -X POST https://kolo-api.onrender.com/api/payments/paydrc/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaign_id": 1,
    "ticket_count": 1,
    "phone_number": "0972148867"
  }'

# 3. Check status
curl -X GET https://kolo-api.onrender.com/api/payments/paydrc/status/KOLO-xxx \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Simulate Callback (Development)

```bash
curl -X POST http://localhost:5000/api/payments/paydrc/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Reference": "KOLO-1704567890-ABC123",
    "Trans_Status": "Successful",
    "Transaction_id": "PDABXKT031fD08M9PfR24C14",
    "Amount": 200,
    "Currency": "CDF"
  }'
```

## Files Modified

- `server/src/services/paydrc.js` - PayDRC API service
- `server/src/routes/payments.js` - Payment routes (initiate, status, callback)
- `server/.env.example` - Environment template

## Security Considerations

1. **Never commit credentials** - Use environment variables
2. **Verify signatures** - Always validate X-Signature header in production
3. **IP Whitelisting** - Consider allowing only PayDRC IPs for callback
4. **HTTPS only** - All API calls should use HTTPS
5. **Idempotency** - Callbacks may be sent multiple times; check payment status before processing

## Support

For PayDRC API issues, contact:
- Email: patrick_bitafu@kolo.cd
- Phone: +243841209627
- Dashboard: https://paydrc.gofreshbakery.net
