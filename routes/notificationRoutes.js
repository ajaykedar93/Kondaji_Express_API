// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Make sure this is included

// Twilio config from .env
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// ✅ POST /api/send-sms
router.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Also move this to .env
      to: to,
    });

    res.json({ success: true, sid: result.sid });
  } catch (err) {
    console.error('SMS send error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// ✅ POST /api/send-email
router.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'yahoo',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (err) {
    console.error('Email sending error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
