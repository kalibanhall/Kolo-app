const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KOLO Tombola API',
      version: '1.0.0',
      description: 'API documentation for KOLO - Digital Lottery Platform',
      contact: {
        name: 'KOLO Support',
        email: 'support@kolo.cd'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.kolo.cd',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            nom: { type: 'string', example: 'Doe' },
            prenom: { type: 'string', example: 'John' },
            telephone: { type: 'string', example: '+243812345678' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            email_verified: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nom_campagne: { type: 'string', example: 'Villa Moderne Kinshasa' },
            description: { type: 'string', example: 'Belle villa avec 4 chambres' },
            prix_ticket: { type: 'number', format: 'float', example: 1.00 },
            nombre_tickets_max: { type: 'integer', example: 1000 },
            nombre_tickets_vendus: { type: 'integer', example: 450 },
            date_debut: { type: 'string', format: 'date-time' },
            date_fin: { type: 'string', format: 'date-time' },
            statut: { type: 'string', enum: ['active', 'terminee', 'annulee'], example: 'active' },
            image_url: { type: 'string', example: '/images/villa.jpg' }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            numero_ticket: { type: 'string', example: 'TKT-20240115-001' },
            campagne_id: { type: 'integer', example: 1 },
            utilisateur_id: { type: 'integer', example: 5 },
            prix_paye: { type: 'number', format: 'float', example: 1.00 },
            date_achat: { type: 'string', format: 'date-time' },
            statut_paiement: { type: 'string', enum: ['pending', 'completed', 'failed'], example: 'completed' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            message: { type: 'string', example: 'Detailed error description' },
            statusCode: { type: 'integer', example: 400 }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management'
      },
      {
        name: 'Campaigns',
        description: 'Lottery campaign management'
      },
      {
        name: 'Tickets',
        description: 'Ticket purchase and management'
      },
      {
        name: 'Payments',
        description: 'Payment processing and verification'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (admin only)'
      },
      {
        name: 'Users',
        description: 'User profile management'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KOLO API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

module.exports = { setupSwagger, swaggerSpec };
