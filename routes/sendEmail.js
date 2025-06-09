const nodemailer = require('nodemailer');
require('dotenv').config();  // Load environment variables from .env

// Create a transporter using Yahoo SMTP
const transporter = nodemailer.createTransport({
  service: 'Yahoo',
  auth: {
    user: process.env.EMAIL_USER, // Email from the .env file
    pass: process.env.EMAIL_PASS  // Password from the .env file
  }
});

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (userEmail, userName, orderId, total) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,  // Sender email from .env
    to: userEmail, // Receiver email
    subject: `Order Confirmation: ${orderId}`,
    text: `Hello ${userName},\n\nYour order with ID ${orderId} has been placed successfully.\nTotal: ₹${total}\nThank you for shopping with us!\n\nRegards,\nKondaji Chiwda`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendOrderConfirmationEmail;
