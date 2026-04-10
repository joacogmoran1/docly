// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import sequelize from './config/database.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';
import ApiError from './utils/ApiError.js';

// Importar modelos y asociaciones
import './database/models/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// MIDDLEWARES DE SEGURIDAD
// ============================================================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS - Configuración estricta
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // 🔒 IMPORTANTE: Permite enviar cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting global
app.use('/api', apiLimiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser - 🔒 IMPORTANTE para leer httpOnly cookies
app.use(cookieParser());

// Logger HTTP
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================================================
// RUTAS
// ============================================================================

app.use('/api', routes);

// Ruta no encontrada
app.all('*', (req, res, next) => {
  next(new ApiError(404, `No se encontró la ruta: ${req.originalUrl}`));
});

// Manejador de errores global
app.use(errorHandler);

// ============================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================================================

const startServer = async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos exitosa');

    // Sincronizar modelos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Modelos sincronizados');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 CORS habilitado para: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejar errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Apagando servidor...');
  logger.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Apagando servidor...');
  logger.error(err);
  process.exit(1);
});

startServer();
