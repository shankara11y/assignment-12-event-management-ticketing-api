process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');

describe('Event Ticketing & Live Booking API Suite', () => {
  let organizerToken;
  let organizerId;
  let attendeeToken;
  let attendeeId;
  let eventId;
  let ticketId;

  describe('🔐 1. Authentication & RBAC', () => {
    it('should register a new Organizer user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Organizer One',
          email: 'organizer@test.com',
          password: 'Password123!',
          role: 'Organizer'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toEqual('Organizer');

      organizerToken = res.body.data.token;
      organizerId = res.body.data.user.id;
    });

    it('should register a new Attendee user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Attendee One',
          email: 'attendee@test.com',
          password: 'Password123!',
          role: 'Attendee'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      attendeeToken = res.body.data.token;
      attendeeId = res.body.data.user.id;
    });

    it('should authenticate user and return token on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'organizer@test.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should return user profile when token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toEqual('organizer@test.com');
    });
  });

  describe('🎪 2. Event Management Endpoints', () => {
    it('should reject event creation by Attendee role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          title: 'Unauthorized Event',
          description: 'Testing RBAC',
          category: 'Technology',
          eventDate: '2026-07-01T10:00:00Z',
          venue: 'Mumbai',
          ticketPrice: 500,
          totalCapacity: 50
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should allow Organizer to create a new Event listing', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Global Cloud & AI Summit 2026',
          description: 'Annual flagship backend conference',
          category: 'Technology',
          eventDate: '2026-06-15T09:00:00Z',
          venue: 'Bandra Kurla Complex, Mumbai',
          ticketPrice: 1000,
          totalCapacity: 5
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.availableTickets).toEqual(5);

      eventId = res.body.data.id;
    });

    it('should list all events with query filtering', async () => {
      const res = await request(app)
        .get('/api/events?category=Technology&city=Mumbai');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should view specific event details', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.title).toEqual('Global Cloud & AI Summit 2026');
      expect(res.body.data.availableTickets).toEqual(5);
    });
  });

  describe('🎟️ 3. Atomic Ticket Booking (runTransaction) & Concurrency', () => {
    it('should book tickets atomically and decrement available tickets', async () => {
      const res = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          eventId,
          quantity: 2,
          attendeeName: 'Kunal Sharma',
          attendeeEmail: 'kunal@gmail.com'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toEqual(2);
      expect(res.body.data.totalPaid).toEqual(2000);
      expect(res.body.data.bookingRef).toMatch(/^TKT-/);

      ticketId = res.body.data.id;

      // Verify updated event available tickets (5 - 2 = 3)
      const eventRes = await request(app).get(`/api/events/${eventId}`);
      expect(eventRes.body.data.availableTickets).toEqual(3);
    });

    it('should fail booking if requested quantity exceeds available tickets', async () => {
      const res = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          eventId,
          quantity: 10,
          attendeeName: 'Overbook Tester',
          attendeeEmail: 'overbook@gmail.com'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Insufficient tickets available');
    });

    it('should list purchased tickets for logged-in Attendee', async () => {
      const res = await request(app)
        .get('/api/tickets/my-tickets')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].eventId).toEqual(eventId);
    });

    it('should allow Organizer to view registered attendees for their event', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/attendees`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].attendeeName).toEqual('Kunal Sharma');
    });
  });

  describe('🔄 4. Ticket Cancellation & Inventory Restoration', () => {
    it('should cancel ticket and restore available ticket inventory', async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/cancel`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toEqual('cancelled');

      // Verify restored available tickets (3 + 2 = 5)
      const eventRes = await request(app).get(`/api/events/${eventId}`);
      expect(eventRes.body.data.availableTickets).toEqual(5);
    });

    it('should reject double cancellation of the same ticket', async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/cancel`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('already cancelled');
    });
  });

  describe('⚡ 5. Swagger Documentation Endpoint', () => {
    it('should render Swagger UI on GET /api-docs', async () => {
      const res = await request(app).get('/api-docs/');
      expect([200, 301, 302]).toContain(res.statusCode);
    });
  });
});
