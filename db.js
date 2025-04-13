const { Pool } = require('pg');

const pool = new Pool({
  user: 'ajay',
  host: 'dpg-cvtofsjuibrs73dnm67g-a.oregon-postgres.render.com',
  database: 'websitedb_v41o',
  password: 'gWG2Ao6F00BKwtRNe0TBKK0KaMzIxsLv',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
