import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do PostgreSQL baseadas nas credenciais fornecidas
const pgConfig = {
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  host: process.env.PG_HOST || 'pizzaria_postgres',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'pizzaria',
  ssl: process.env.PG_SSL === 'true'
};

// Criar pool de conexões para reutilização eficiente
const pool = new Pool(pgConfig);

console.log('[PostgresConfig] Configuração de conexão inicializada');
console.log(`[PostgresConfig] Conectando a: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);

// Testar conexão ao inicializar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[PostgresConfig] Erro ao conectar ao PostgreSQL:', err);
  } else {
    console.log(`[PostgresConfig] Conexão PostgreSQL estabelecida com sucesso: ${res.rows[0].now}`);
  }
});

// Evento para monitorar erros de conexão
pool.on('error', (err) => {
  console.error('[PostgresConfig] Erro inesperado no pool de conexões:', err);
});

export default pool;
