const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { bookingRateLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /api/tickets/book:
 *   post:
 *     summary: Atomic Ticket Booking (Rate Limited - 10 req/min)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookTicketInput'
 *     responses:
 *       201:
 *         description: Tickets booked successfully via ACID transaction
 *       400:
 *         description: Insufficient tickets or invalid data
 *       429:
 *         description: Rate limit exceeded (Too Many Requests)
 */
router.post('/book', authenticateToken, checkRole('Attendee'), bookingRateLimiter, ticketController.bookTicket);

/**
 * @swagger
 * /api/tickets/my-tickets:
 *   get:
 *     summary: View purchased tickets for authenticated Attendee
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user tickets
 */
router.get('/my-tickets', authenticateToken, checkRole('Attendee'), ticketController.getMyTickets);

/**
 * @swagger
 * /api/tickets/{id}/cancel:
 *   post:
 *     summary: Cancel ticket & restore inventory via transaction
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully and inventory restored
 *       400:
 *         description: Ticket already cancelled or invalid
 *       403:
 *         description: Forbidden - ticket does not belong to user
 */
router.post('/:id/cancel', authenticateToken, checkRole('Attendee'), ticketController.cancelTicket);

module.exports = router;
