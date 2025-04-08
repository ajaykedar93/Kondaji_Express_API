const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/payment
router.post('/payment', async (req, res) => {
  const { amount, currency = 'inr', description } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe accepts in paisa for INR, cents for USD
      currency,
      description,
      payment_method_types: ['card'], // Optional: only 'card' payments
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      message: 'Payment intent created successfully',
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

module.exports = router;
