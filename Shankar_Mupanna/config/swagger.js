const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Ticketing & Live Booking API',
      version: '1.0.0',
      description:
        'High-concurrency Event Ticketing & Live Booking REST API backed by Google Firebase Firestore, secured with JWT Role-Based Access Control (RBAC), hardened with rate limiting, and featuring Firestore ACID transaction ticket booking.',
      contact: {
        name: 'API Support',
        email: 'support@keralaxplore.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5003}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide a valid JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        UserRegister: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Kunal Sharma' },
            email: { type: 'string', example: 'kunal@gmail.com' },
            password: { type: 'string', example: 'Password@123' },
            role: { type: 'string', enum: ['Attendee', 'Organizer'], example: 'Attendee' }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'kunal@gmail.com' },
            password: { type: 'string', example: 'Password@123' }
          }
        },
        EventInput: {
          type: 'object',
          required: ['title', 'description', 'category', 'eventDate', 'venue', 'ticketPrice', 'totalCapacity'],
          properties: {
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 }
          }
        },
        EventResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'event_techconf_2026' },
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            organizerId: { type: 'string', example: 'usr_organizer_01' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 },
            availableTickets: { type: 'integer', example: 482 },
            createdAt: { type: 'string', example: '2026-03-01T12:00:00Z' }
          }
        },
        BookTicketInput: {
          type: 'object',
          required: ['eventId', 'quantity', 'attendeeName', 'attendeeEmail'],
          properties: {
            eventId: { type: 'string', example: 'event_techconf_2026' },
            quantity: { type: 'integer', example: 2 },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', example: 'kunal@gmail.com' }
          }
        },
        TicketResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ticket_rec_88219' },
            eventId: { type: 'string', example: 'event_techconf_2026' },
            eventTitle: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            userId: { type: 'string', example: 'usr_attendee_99' },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', example: 'kunal@gmail.com' },
            quantity: { type: 'integer', example: 2 },
            totalPaid: { type: 'number', example: 2998 },
            bookingRef: { type: 'string', example: 'TKT-2026-88219' },
            status: { type: 'string', enum: ['confirmed', 'cancelled'], example: 'confirmed' },
            bookedAt: { type: 'string', example: '2026-03-02T16:20:00Z' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
