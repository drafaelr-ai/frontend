// frontend/src/utils/logger.js
//
// Wrapper de console que SOME em produção.
//
// USO:
//   import { logger } from './utils/logger';
//
//   logger.debug('Token recebido', token);
//   logger.info('Usuário logou', user.email);
//   logger.warn('API demorou', ms, 'ms');
//   logger.error('Falha ao salvar', err);
//
// Em produção (NODE_ENV=production), apenas `error` é logado.
// Em dev, todos os níveis vão pro console.
//
// Por que não usar console direto? Porque ele permaneceria em produção,
// poluindo o devtools dos usuários, e em alguns casos vazando dados.

const isProd = process.env.NODE_ENV === 'production';

const noop = () => {};

export const logger = {
  debug: isProd ? noop : console.debug.bind(console, '[debug]'),
  info:  isProd ? noop : console.info.bind(console, '[info]'),
  warn:  console.warn.bind(console, '[warn]'),
  error: console.error.bind(console, '[error]'),
};

// Versão default export pra import simples
export default logger;
