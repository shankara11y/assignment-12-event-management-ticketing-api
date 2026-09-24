const { db } = require('../config/firebaseConfig');

exports.getEvents = async (req, res, next) => {
  try {
    const { category, city, venue } = req.query;
    let snapshot = await db.collection('events').get();
    let events = snapshot.docs.map(doc => doc.data());

    // Apply filtering if query parameters provided
    if (category) {
      events = events.filter(
        e => e.category && e.category.toLowerCase() === category.toLowerCase()
      );
    }

    const cityOrVenueFilter = city || venue;
    if (cityOrVenueFilter) {
      events = events.filter(
        e => e.venue && e.venue.toLowerCase().includes(cityOrVenueFilter.toLowerCase())
      );
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('events').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: doc.data()
    });
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, category, eventDate, venue, ticketPrice, totalCapacity } = req.body;

    if (!title || !description || !category || !eventDate || !venue || ticketPrice === undefined || totalCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: title, description, category, eventDate, venue, ticketPrice, totalCapacity'
      });
    }

    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;
    const capacity = parseInt(totalCapacity, 10);
    const price = parseFloat(ticketPrice);

    const newEvent = {
      id: eventId,
      title,
      description,
      category,
      eventDate: new Date(eventDate).toISOString(),
      venue,
      organizerId: req.user.id,
      ticketPrice: price,
      totalCapacity: capacity,
      availableTickets: capacity,
      createdAt: new Date().toISOString()
    };

    await eventRef.set(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = doc.data();

    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update events created by you.'
      });
    }

    const { title, description, category, eventDate, venue, ticketPrice, totalCapacity } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (eventDate !== undefined) updates.eventDate = new Date(eventDate).toISOString();
    if (venue !== undefined) updates.venue = venue;
    if (ticketPrice !== undefined) updates.ticketPrice = parseFloat(ticketPrice);
    if (totalCapacity !== undefined) {
      const newCapacity = parseInt(totalCapacity, 10);
      const capacityDiff = newCapacity - eventData.totalCapacity;
      updates.totalCapacity = newCapacity;
      updates.availableTickets = Math.max(0, eventData.availableTickets + capacityDiff);
    }

    updates.updatedAt = new Date().toISOString();

    await eventRef.update(updates);

    const updatedDoc = await eventRef.get();

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedDoc.data()
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = doc.data();

    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete events created by you.'
      });
    }

    await eventRef.delete();

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
