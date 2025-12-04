const SERVICES = {
  'rasi-autocitas': {
    id: 'rasi-autocitas',
    name: {
      es: 'Rasi Autocitas',
      en: 'Rasi Autocitas'
    },
    monthlyPrice: 15,
    currency: 'USD',
    description: {
      es: 'La forma más simple y rápida de gestionar citas sin esfuerzo. Automatiza recordatorios, reduce ausencias y organiza tu agenda con tecnología inteligente desde el primer día.',
      en: 'The simplest and fastest way to manage appointments effortlessly. Automate reminders, reduce no-shows, and organize your schedule with smart technology from day one.'
    },
    features: {
      es: [
        'Recordatorios automáticos por WhatsApp',
        'Recordatorios automáticos por correo',
        'Soporte técnico en horario laboral',
        'Configuración inicial personalizada',
        'Integración con agendas médicas'
      ],
      en: [
        'Automatic WhatsApp reminders',
        'Automatic email reminders',
        'Technical support during business hours',
        'Personalized initial setup',
        'Integration with medical schedules'
      ]
    },
    flowType: 'contact',
    active: true
  },
  'rasi-assistant': {
    id: 'rasi-assistant',
    name: {
      es: 'Rasi Assistant',
      en: 'Rasi Assistant'
    },
    monthlyPrice: 20,
    currency: 'USD',
    description: {
      es: 'Tu nuevo asistente inteligente que piensa, responde y trabaja por ti. IA avanzada, automatización total y control centralizado para transformar la operación de tu negocio.',
      en: 'Your new intelligent assistant that thinks, responds, and works for you. Advanced AI, total automation, and centralized control to transform your business operations.'
    },
    features: {
      es: [
        'Credenciales de acceso inmediato',
        'IA conversacional avanzada (GPT + entrenamiento interno)',
        'Integración con página web y otros sistemas',
        //'Panel de administración completo',
        'Soporte 24/7',
        'Actualizaciones automáticas',
        //'Multiusuarios / roles administrativos'
      ],
      en: [
        'Immediate access credentials',
        'Advanced conversational AI (GPT + internal training)',
        'Integration with website and other systems',
        //'Complete administration panel',
        '24/7 Support',
        'Automatic updates',
        //'Multi-user / administrative roles'
      ]
    },
    flowType: 'credentials',
    active: true
  },
  'rasi-chatbot': {
    id: 'rasi-chatbot',
    name: {
      es: 'Rasi Chatbot',
      en: 'Rasi Chatbot'
    },
    monthlyPrice: 225,
    currency: 'USD',
    description: {
      es: 'Atiende a tus clientes en segundos, 24/7, sin depender de nadie. Un chatbot ágil, conversacional y siempre disponible para resolver, guiar y acompañar.',
      en: 'Serve your customers in seconds, 24/7, without depending on anyone. An agile, conversational chatbot always available to solve, guide, and support.'
    },
    features: {
      es: [
        'Respuestas automáticas 24/7',
        'IA conversacional avanzada',
        'Panel de administración',
        'Integración con WhatsApp, Instagram y Telegram',
        'Flujos personalizados y predefinidos',
        'Soporte técnico',
        'Métricas de uso esenciales'
      ],
      en: [
        '24/7 automated responses',
        'Advanced conversational AI',
        'Administration panel',
        'Integration with WhatsApp, Instagram, and Telegram',
        'Custom and predefined flows',
        'Technical support',
        'Essential usage metrics'
      ]
    },
    flowType: 'chatbot',
    active: true
  }
};

module.exports = SERVICES;
