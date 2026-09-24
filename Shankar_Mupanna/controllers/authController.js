const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_event_management_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    const userRole = role === 'Organizer' ? 'Organizer' : 'Attendee';

    // Check if user already exists
    const existingUsers = await db.collection('users').where('email', '==', email).get();
    if (existingUsers.docs && existingUsers.docs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRef = db.collection('users').doc();
    const userId = userRef.id;

    const newUser = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      role: userRole,
      createdAt: new Date().toISOString()
    };

    await userRef.set(newUser);

    const token = jwt.sign(
      { id: userId, email, role: userRole, name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: userId,
          name,
          email,
          role: userRole,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const usersSnapshot = await db.collection('users').where('email', '==', email).get();
    if (!usersSnapshot.docs || usersSnapshot.docs.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: userData.id || userDoc.id, email: userData.email, role: userData.role, name: userData.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: userData.id || userDoc.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const userData = userDoc.data();
    delete userData.password;

    return res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    next(error);
  }
};
