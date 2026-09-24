const { db } = require('../config/firebaseConfig');

exports.bookTicket = async (req, res, next) => {
  const { eventId, quantity, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;
  const qty = parseInt(quantity, 10);

  if (!eventId || !qty || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid eventId and quantity (> 0) are required.'
    });
  }

  const name = attendeeName || req.user.name || 'Attendee';
  const email = attendeeEmail || req.user.email || '';

  const eventRef = db.collection('events').doc(eventId);
  const ticketRef = db.collection('tickets').doc();

  try {
    const result = await db.runTransaction(async (t) => {
      const eventDoc = await t.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      if (eventData.availableTickets < qty) {
        throw new Error('Insufficient tickets available');
      }

      // 1. Decrement available tickets
      t.update(eventRef, {
        availableTickets: eventData.availableTickets - qty
      });

      // 2. Create ticket document
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `TKT-${Date.now().toString().slice(-6)}-${randomSuffix}`;
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        userId,
        attendeeName: name,
        attendeeEmail: email,
        quantity: qty,
        totalPaid: qty * (eventData.ticketPrice || 0),
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString()
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    return res.status(201).json({
      success: true,
      message: 'Tickets booked successfully',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const snapshot = await db.collection('tickets').where('userId', '==', userId).get();
    const tickets = snapshot.docs.map(doc => doc.data());

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelTicket = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ticketRef = db.collection('tickets').doc(id);

  try {
    const result = await db.runTransaction(async (t) => {
      const ticketDoc = await t.get(ticketRef);
      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      if (ticketData.userId !== userId) {
        throw new Error('Forbidden: You do not own this ticket');
      }

      if (ticketData.status === 'cancelled') {
        throw new Error('Ticket is already cancelled');
      }

      const eventRef = db.collection('events').doc(ticketData.eventId);
      const eventDoc = await t.get(eventRef);

      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        t.update(eventRef, {
          availableTickets: eventData.availableTickets + ticketData.quantity
        });
      }

      const updatedTicket = {
        ...ticketData,
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      };

      t.update(ticketRef, {
        status: 'cancelled',
        cancelledAt: updatedTicket.cancelledAt
      });

      return updatedTicket;
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully and inventory restored',
      data: result
    });
  } catch (error) {
    const statusCode = error.message.includes('Forbidden') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

exports.getEventAttendees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventDoc = await db.collection('events').doc(id).get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = eventDoc.data();

    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only view attendees for events created by you.'
      });
    }

    const snapshot = await db.collection('tickets').where('eventId', '==', id).get();
    const attendees = snapshot.docs.map(doc => doc.data());

    return res.status(200).json({
      success: true,
      eventTitle: eventData.title,
      totalAttendeesCount: attendees.length,
      data: attendees
    });
  } catch (error) {
    next(error);
  }
};
