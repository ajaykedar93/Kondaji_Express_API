const { Pool } = require('pg');

const pool = new Pool({
  user: 'mypostgredb_7b49_user',
  host: 'dpg-cvon493uibrs73bugo2g-a.oregon-postgres.render.com', 
  database: 'mypostgredb_7b49',
  password: '1Tptj5JtWfvCfrJx582tWQegpDkIVRQh',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
