const axios = require('axios');
require('dotenv').config();

const SAAS_API_URL = process.env.SAAS_API_URL || 'http://localhost:5000';

console.log('🧪 PRUEBA CON PAYLOAD CORREGIDO');
console.log('================================\n');

async function testCorrectPayload() {
  const testData = {
    // Empresa
    nombre_empresa: `Empresa Test ${Date.now()}`,
    nit: '900999999',
    representante_legal: 'Test Legal Rep',
    // Usuario
    correo: `test_${Date.now()}@example.com`,
    nombre_usuario: 'Test Usuario',
    documento: '9999999999',
    password: 'TestPassword123!',
    confirmar_password: 'TestPassword123!'
  };

  console.log('📤 Enviando payload corregido:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await axios.post(
      `${SAAS_API_URL}/api/auth/registro-publico`,
      testData,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ ✅ ✅ REGISTRO EXITOSO ✅ ✅ ✅\n');
    console.log('Status:', response.status);
    console.log('Message:', response.data.message);
    console.log('');
    console.log('📋 Estructura de respuesta:');
    console.log({
      hasToken: !!response.data.token,
      hasUsuario: !!response.data.usuario,
      hasEmpresa: !!response.data.empresa,
      hasCredenciales: !!response.data.credenciales
    });
    console.log('');

    if (response.data.credenciales) {
      console.log('🔑 Credenciales retornadas:');
      console.log('   Email:', response.data.credenciales.email_usuario);
      console.log('   Password:', '***' + response.data.credenciales.password_usuario.slice(-4));
    }

    if (response.data.usuario) {
      console.log('');
      console.log('👤 Usuario creado:');
      console.log('   ID:', response.data.usuario.id);
      console.log('   Nombre:', response.data.usuario.nombre_usuario);
      console.log('   Email:', response.data.usuario.email_usuario);
      console.log('   Rol:', response.data.usuario.rol_usuario);
    }

    if (response.data.empresa) {
      console.log('');
      console.log('🏢 Empresa creada:');
      console.log('   ID:', response.data.empresa.id);
      console.log('   Nombre:', response.data.empresa.nombre);
      console.log('   NIT:', response.data.empresa.nit);
    }

  } catch (error) {
    console.log('❌ REGISTRO FALLÓ\n');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ No se pudo conectar con el servidor SaaS');
      console.log('👉 Asegúrate de que el servidor esté corriendo en:', SAAS_API_URL);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n================================');
}

testCorrectPayload().catch(console.error);
