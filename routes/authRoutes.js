const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const appEmitter = require('../utils/eventEmitter');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register a new user with hashed password
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'user'
    });

    // Emit registration event
    appEmitter.emit('userRegistered', newUser);

    return res.status(201).json({
      message: 'User registered',
      id: newUser._id,
      username: newUser.username,
      email: newUser.email
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sign JWT matching payload fields in Fig 1 (id, role, username)
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Also attach token in cookie for clients/Postman using cookies
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3600000 // 1 hour
    });

    // Emit login event
    appEmitter.emit('userLoggedIn', user);

    return res.status(200).json({
      message: 'Login successful',
      token
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   GET /api/auth/admin
// @desc    Protected RBAC route accessible only to admins
router.get('/admin', verifyToken, authorizeRoles('admin'), (req, res) => {
  res.status(200).json({
    message: `Welcome Admin ${req.user.username}`,
    user: req.user
  });
});

module.exports = router;