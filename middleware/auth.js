const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Merchant = require('../models/Merchant');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} role is not authorized.` 
      });
    }

    next();
  };
};

// Check if merchant is approved
const requireApprovedMerchant = async (req, res, next) => {
  try {
    if (req.user.role !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant role required.' });
    }

    const merchant = await Merchant.findOne({ userId: req.user._id });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found.' });
    }

    if (merchant.activeStatus !== 'approved') {
      return res.status(403).json({ 
        message: 'Access denied. Your merchant account is pending approval.', 
        status: merchant.activeStatus 
      });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// Specific role middlewares
const requireCustomer = authorize('customer');
const requireMerchant = authorize('merchant');
const requireAdmin = authorize('admin');
const requireMerchantOrAdmin = authorize('merchant', 'admin');

// Optional authentication (for public routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  verifyToken,
  authorize,
  requireCustomer,
  requireMerchant,
  requireApprovedMerchant,
  requireAdmin,
  requireMerchantOrAdmin,
  optionalAuth
};
