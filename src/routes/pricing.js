// backend/routes/pricing.js
const express = require('express');
const router = express.Router();
const SERVICES = require('../config/services');

// ✅ Obtener todos los servicios
router.get('/services', (req, res) => {
  try {
    // Retornar solo servicios activos
    const activeServices = Object.values(SERVICES)
      .filter(service => service.active)
      .map(service => ({
        id: service.id,
        name: service.name,
        monthlyPrice: service.monthlyPrice,
        currency: service.currency,
        description: service.description,
        features: service.features,
        flowType: service.flowType
      }));

    res.json(activeServices);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo servicios' });
  }
});

// ✅ Obtener un servicio específico
router.get('/services/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = SERVICES[serviceId];

    if (!service || !service.active) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({
      id: service.id,
      name: service.name,
      monthlyPrice: service.monthlyPrice,
      currency: service.currency,
      description: service.description,
      features: service.features,
      flowType: service.flowType
    });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo servicio' });
  }
});

module.exports = router;
