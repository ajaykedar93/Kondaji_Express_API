const pool = require('../db');

exports.updateProduct = async (id, product) => {
  const {
    name, price, image, description,
    discount, offer, is_sale, in_stock
  } = product;

  const result = await db.query(
    `UPDATE products
     SET name = $1, price = $2, image = $3, description = $4,
         discount = $5, offer = $6, is_sale = $7, in_stock = $8
     WHERE id = $9
     RETURNING *`,
    [name, price, image, description, discount, offer, is_sale, in_stock, id]
  );

  return result.rows[0];
};
