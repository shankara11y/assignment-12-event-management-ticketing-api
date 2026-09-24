# Event Ticketing & Live Booking API with Firebase & Swagger

![Node.js](https://img.shields.io/badge/Node.js-v24.20.0-green)
![Express](https://img.shields.io/badge/Express-v4.21.2-blue)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![Swagger](https://img.shields.io/badge/OpenAPI-3.0-brightgreen)
![License](https://img.shields.io/badge/License-ISC-blue)

A high-concurrency Event Ticketing & Live Booking REST API backed by Google Firebase Firestore, secured with JWT Role-Based Access Control (RBAC - Organizer vs Attendee), hardened with API Rate Limiting for bot/scalper protection, and documented with OpenAPI 3.0 JSDoc tags and interactive Swagger UI.

---

## 📌 Features & Highlights

- **Firestore ACID Transactions (`runTransaction`)**: Guarantees zero ticket overbooking under concurrent ticket purchasing traffic by atomically checking available seats and updating doc state.
- **Scalper & Bot Protection (`express-rate-limit`)**: Implements strict rate-limiting (10 requests / minute) on ticket booking endpoints to prevent bot spam and DDoS attacks.
- **Multi-Role Authorization (RBAC)**: JWT authentication distinguishing **Organizers** (create, edit, delete events, view attendees) and **Attendees** (browse events, book tickets, view & cancel bookings).
- **Interactive Swagger Documentation**: Comprehensive OpenAPI 3.0 documentation hosted live at `/api-docs`.
- **Flexible Data Store Options**: Works with real Firebase Admin SDK / Service Account Credentials, and includes built-in Mock Firestore fallback for local offline testing.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database & Auth**: Google Firebase Admin SDK (Firestore), JSON Web Tokens (JWT), bcryptjs
- **Security & Protection**: `express-rate-limit`, `cors`, `dotenv`
- **Documentation**: `swagger-ui-express`, `swagger-jsdoc`
- **Testing**: `jest`, `supertest`

---

## 🗄️ Firestore Collection Schemas

### 1. `events` Collection
```json
{
  "id": "event_techconf_2026",
  "title": "Global Cloud & AI Summit 2026",
  "description": "Annual flagship backend conference",
  "category": "Technology",
  "eventDate": "2026-06-15T09:00:00Z",
  "venue": "Bandra Kurla Complex, Mumbai",
  "organizerId": "usr_organizer_01",
  "ticketPrice": 1499,
  "totalCapacity": 500,
  "availableTickets": 482,
  "createdAt": "2026-03-01T12:00:00Z"
}
```

### 2. `tickets` Collection
```json
{
  "id": "ticket_rec_88219",
  "eventId": "event_techconf_2026",
  "eventTitle": "Global Cloud & AI Summit 2026",
  "userId": "usr_attendee_99",
  "attendeeName": "Kunal Sharma",
  "attendeeEmail": "kunal@gmail.com",
  "quantity": 2,
  "totalPaid": 2998,
  "bookingRef": "TKT-2026-88219",
  "status": "confirmed", // "confirmed", "cancelled"
  "bookedAt": "2026-03-02T16:20:00Z"
}
```

### 3. `users` Collection
```json
{
  "id": "usr_attendee_99",
  "name": "Kunal Sharma",
  "email": "kunal@gmail.com",
  "password": "$2a$10$hashedpassword...",
  "role": "Attendee", // "Attendee", "Organizer"
  "createdAt": "2026-03-01T10:00:00Z"
}
```

---

## 📋 API Endpoints Specification

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Role Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register as Attendee or Organizer |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve user profile & role |

### 🎪 Event Management (`/api/events`)
| Method | Endpoint | Role Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Browse all events (supports `?category=Technology&city=Mumbai`) |
| `GET` | `/api/events/:id` | Public | View event details & live remaining ticket count |
| `POST` | `/api/events` | Organizer | Create new event listing |
| `PUT` | `/api/events/:id` | Organizer | Update event details (Organizer must own event) |
| `DELETE` | `/api/events/:id` | Organizer | Cancel and delete event |
| `GET` | `/api/events/:id/attendees` | Organizer | List all registered attendees for the event |

### 🎟️ Ticket Booking & Scalper Protection (`/api/tickets`)
| Method | Endpoint | Role Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets/book` | Attendee | **Atomic Booking**: 10 req/min limit. Decrements tickets via transaction |
| `GET` | `/api/tickets/my-tickets` | Attendee | View purchased tickets for logged-in user |
| `POST` | `/api/tickets/:id/cancel` | Attendee | Cancel ticket & restore ticket inventory via transaction |

### 📚 Interactive Swagger Documentation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api-docs` | Interactive Swagger UI documentation for all endpoints |

---

## ⚡ Firestore Concurrency Transaction Logic

```javascript
const { db } = require('./config/firebaseConfig');

exports.bookTicket = async (req, res, next) => {
  const { eventId, quantity, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;
  const qty = parseInt(quantity, 10);

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
      const bookingRef = `TKT-${Date.now().toString().slice(-6)}`;
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        userId,
        attendeeName,
        attendeeEmail,
        quantity: qty,
        totalPaid: qty * eventData.ticketPrice,
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString()
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    res.status(201).json({ success: true, message: 'Tickets booked successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
```

---

## 🚀 Setup & Execution Instructions

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/itm-assignment-12-event-ticketing-api.git
cd assignment-12-event-ticketing-api
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
JWT_SECRET=super_secret_jwt_key_event_management_2026
JWT_EXPIRES_IN=24h
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=keralaxplore-events
```

### 3. Firebase Setup (Optional for Live Firebase)
Place your Firebase Admin SDK Service Account JSON file as `serviceAccountKey.json` in the root directory. If omitted, the API will automatically use the built-in In-Memory Mock Firestore for local testing.

### 4. Run Server
```bash
# Production mode
npm start

# Development mode with nodemon
npm run dev
```

### 5. Access Interactive Swagger Docs
Open `http://localhost:5000/api-docs` in your browser.

---

## 🧪 Testing

Execute automated integration test suite:
```bash
npm test
```

---

## 📄 License
ISC License.
