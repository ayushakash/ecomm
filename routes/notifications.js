const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const OTP = require('../models/OTP');
const { verifyToken: auth, requireAdmin: adminAuth } = require('../middleware/auth');

// Send SMS notification
router.post('/sms/send', auth, async (req, res) => {
  console.log('SMS send request body:', req.body);
  try {
    const { phone, message, templateId, templateData } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ message: 'Phone and message are required' });
    }

    const result = await NotificationService.sendSMS(phone, message, templateId, templateData);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'SMS sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send SMS',
        error: result.error
      });
    }
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send WhatsApp notification
router.post('/whatsapp/send', auth, async (req, res) => {
  console.log('WhatsApp send request body:', req.body);
  try {
    const { phone, templateId, templateData } = req.body;

    if (!phone || !templateId) {
      return res.status(400).json({ message: 'Phone and templateId are required' });
    }

    const result = await NotificationService.sendWhatsApp(phone, templateId, templateData);
    
    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'WhatsApp message sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send OTP via SMS
router.post('/otp/sms/send', async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if recent OTP exists
    const recentOTP = await OTP.findOne({
      phone: phone,
      purpose: purpose,
      isUsed: false,
      createdAt: { $gte: new Date(Date.now() - 30 * 1000) } // Last 30 seconds
    });

    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait before requesting another OTP',
        retryAfter: 30
      });
    }

    const result = await NotificationService.sendOTPSMS(phone, purpose);
    
    if (result.success) {
      // Save OTP record
      const otpRecord = new OTP({
        phone: phone,
        otp: 'HIDDEN', // We don't store actual OTP for security
        purpose: purpose,
        sentVia: 'sms',
        msg91Response: {
          requestId: result.requestId,
          type: result.type,
          message: result.message
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await otpRecord.save();

      res.json({
        success: true,
        requestId: result.requestId,
        message: 'OTP sent successfully',
        expiresIn: 300 // 5 minutes in seconds
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send OTP',
        error: result.error
      });
    }
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send OTP via WhatsApp
router.post('/otp/whatsapp/send', async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if recent OTP exists
    const recentOTP = await OTP.findOne({
      phone: phone,
      purpose: purpose,
      isUsed: false,
      createdAt: { $gte: new Date(Date.now() - 30 * 1000) }
    });

    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait before requesting another OTP',
        retryAfter: 30
      });
    }

    const result = await NotificationService.sendOTPWhatsApp(phone, purpose);
    
    if (result.success) {
      // Save OTP record
      const otpRecord = new OTP({
        phone: phone,
        otp: 'HIDDEN',
        purpose: purpose,
        sentVia: 'whatsapp',
        msg91Response: {
          requestId: result.requestId,
          type: result.type,
          message: result.message
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await otpRecord.save();

      res.json({
        success: true,
        requestId: result.requestId,
        message: 'OTP sent successfully via WhatsApp',
        expiresIn: 300
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send OTP via WhatsApp',
        error: result.error
      });
    }
  } catch (error) {
    console.error('WhatsApp OTP send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp, purpose = 'login', requestId } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      phone: phone,
      purpose: purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP' 
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP' 
      });
    }

    // Verify with MSG91
    const result = await NotificationService.verifyOTP(phone, otp, requestId);
    
    // Update attempts
    otpRecord.attempts += 1;
    await otpRecord.save();

    if (result.success) {
      // Mark as used
      otpRecord.isUsed = true;
      otpRecord.verifiedAt = new Date();
      await otpRecord.save();

      res.json({
        success: true,
        message: 'OTP verified successfully',
        purpose: purpose
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: 3 - otpRecord.attempts
      });
    }
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get notification analytics (Admin only)
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // OTP Analytics
    const otpStats = await OTP.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            sentVia: '$sentVia',
            purpose: '$purpose',
            isUsed: '$isUsed'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        otp: otpStats
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test n8n webhook
router.post('/test/n8n', adminAuth, async (req, res) => {
  try {
    const testData = {
      eventType: 'test_notification',
      timestamp: new Date(),
      message: 'Test notification from ConstructMart',
      ...req.body
    };

    const result = await NotificationService.sendToN8n(testData);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent to n8n' : 'Failed to send test notification',
      result: result
    });
  } catch (error) {
    console.error('n8n test error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;