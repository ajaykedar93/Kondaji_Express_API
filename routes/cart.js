const express = require("express");
const router = express.Router();
const pool = require("../db");

// Add item to cart (Upsert-style logic)
router.post("/add", async (req, res) => {
  const { user_id, product_id, quantity } = req.body;

  try {
    // Check if the item already exists in the cart
    const existing = await pool.query(
      "SELECT * FROM cart WHERE user_id = $1 AND product_id = $2",
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      // Update quantity if exists
      await pool.query(
        "UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3",
        [quantity, user_id, product_id]
      );
    } else {
      // Insert new row
      await pool.query(
        "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)",
        [user_id, product_id, quantity]
      );
    }

    res.json({ message: "Added to cart" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get user's cart
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        c.id AS cart_id,
        k.name,
        k.image_url,
        k.price,
        c.quantity,
        c.quantity * k.price AS total
       FROM cart c
       JOIN kondaji_chiwda k ON c.product_id = k.product_id
       WHERE c.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
