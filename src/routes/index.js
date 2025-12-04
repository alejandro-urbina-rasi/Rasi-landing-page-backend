const express = require('express');
const router = express.Router();

router.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
