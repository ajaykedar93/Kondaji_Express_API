const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-upi-payment', async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'inr',
      payment_method_types: ['upi'],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment error' });
  }
});

module.exports = router;
