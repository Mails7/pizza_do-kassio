import { Pool, PoolClient } from 'pg';
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

// Classe para construir queries SQL de forma encadeada (similar ao Supabase)
class QueryBuilder<T> {
  private table: string;
  private columns: string[] = ['*'];
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByColumns: string[] = [];
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private client: Pool;
  private paramCount: number = 1;

  constructor(table: string, client: Pool) {
    this.table = table;
    this.client = client;
  }

  // Selecionar colunas específicas
  select(columns: string | string[] = '*'): QueryBuilder<T> {
    if (typeof columns === 'string') {
      this.columns = [columns];
    } else {
      this.columns = columns;
    }
    return this;
  }

  // Adicionar condição WHERE com igualdade
  eq(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} = $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE com desigualdade
  neq(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} != $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE maior que
  gt(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} > $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE menor que
  lt(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} < $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE maior ou igual a
  gte(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} >= $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE menor ou igual a
  lte(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} <= $${this.paramCount}`);
    this.whereParams.push(value);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE IN
  in(column: string, values: any[]): QueryBuilder<T> {
    const placeholders = values.map((_, i) => `$${this.paramCount + i}`).join(', ');
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.whereParams.push(...values);
    this.paramCount += values.length;
    return this;
  }

  // Adicionar condição WHERE LIKE
  like(column: string, pattern: string): QueryBuilder<T> {
    this.whereConditions.push(`${column} LIKE $${this.paramCount}`);
    this.whereParams.push(pattern);
    this.paramCount++;
    return this;
  }

  // Adicionar condição WHERE ILIKE (case insensitive)
  ilike(column: string, pattern: string): QueryBuilder<T> {
    this.whereConditions.push(`${column} ILIKE $${this.paramCount}`);
    this.whereParams.push(pattern);
    this.paramCount++;
    return this;
  }

  // Ordenar resultados
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder<T> {
    this.orderByColumns = [column];
    this.orderDirection = direction;
    return this;
  }

  // Limitar número de resultados
  limit(value: number): QueryBuilder<T> {
    this.limitValue = value;
    return this;
  }

  // Pular resultados (para paginação)
  offset(value: number): QueryBuilder<T> {
    this.offsetValue = value;
    return this;
  }

  // Retornar apenas um resultado
  single(): QueryBuilder<T> {
    this.limitValue = 1;
    return this;
  }

  // Contar resultados
  async count(): Promise<{ count: number, error: any }> {
    try {
      let query = `SELECT COUNT(*) FROM ${this.table}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      const result = await this.client.query(query, this.whereParams);
      return { count: parseInt(result.rows[0].count), error: null };
    } catch (error) {
      console.error('[PostgresClient] Erro ao contar registros:', error);
      return { count: 0, error };
    }
  }

  // Executar a query
  async execute(): Promise<{ data: T[] | null, error: any }> {
    try {
      let query = `SELECT ${this.columns.join(', ')} FROM ${this.table}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      if (this.orderByColumns.length > 0) {
        query += ` ORDER BY ${this.orderByColumns.join(', ')} ${this.orderDirection}`;
      }
      
      if (this.limitValue !== null) {
        query += ` LIMIT ${this.limitValue}`;
      }
      
      if (this.offsetValue !== null) {
        query += ` OFFSET ${this.offsetValue}`;
      }
      
      const result = await this.client.query(query, this.whereParams);
      return { data: result.rows as T[], error: null };
    } catch (error) {
      console.error('[PostgresClient] Erro ao executar query:', error);
      return { data: null, error };
    }
  }

  // Inserir dados
  async insert(data: Partial<T>): QueryBuilder<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    try {
      const query = `
        INSERT INTO ${this.table} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await this.client.query(query, values);
      return new QueryBuilder<T>(this.table, this.client).setData(result.rows as T[]);
    } catch (error) {
      console.error('[PostgresClient] Erro ao inserir dados:', error);
      return new QueryBuilder<T>(this.table, this.client).setError(error);
    }
  }

  // Atualizar dados
  async update(data: Partial<T>): QueryBuilder<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    
    try {
      let query = `
        UPDATE ${this.table}
        SET ${setClause}
      `;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        values.push(...this.whereParams);
      }
      
      query += ' RETURNING *';
      
      const result = await this.client.query(query, values);
      return new QueryBuilder<T>(this.table, this.client).setData(result.rows as T[]);
    } catch (error) {
      console.error('[PostgresClient] Erro ao atualizar dados:', error);
      return new QueryBuilder<T>(this.table, this.client).setError(error);
    }
  }

  // Excluir dados
  async delete(): QueryBuilder<T> {
    try {
      let query = `
        DELETE FROM ${this.table}
      `;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
      
      const result = await this.client.query(query, this.whereParams);
      return new QueryBuilder<T>(this.table, this.client).setData(result.rows as T[]);
    } catch (error) {
      console.error('[PostgresClient] Erro ao excluir dados:', error);
      return new QueryBuilder<T>(this.table, this.client).setError(error);
    }
  }

  // Definir dados para retorno
  private setData(data: T[]): QueryBuilder<T> {
    (this as any).data = data;
    (this as any).error = null;
    return this;
  }

  // Definir erro para retorno
  private setError(error: any): QueryBuilder<T> {
    (this as any).data = null;
    (this as any).error = error;
    return this;
  }
}

// Classe principal para interação com o PostgreSQL
class PostgresClient {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Selecionar tabela para operações
  from<T>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this.pool);
  }

  // Executar query SQL diretamente
  async query<T = any>(text: string, params: any[] = []): Promise<{ data: T[] | null, error: any }> {
    try {
      const result = await this.pool.query(text, params);
      return { data: result.rows as T[], error: null };
    } catch (error) {
      console.error('[PostgresClient] Erro ao executar query:', error);
      return { data: null, error };
    }
  }

  // Obter cliente para transações
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Executar operações em uma transação
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<{ data: T | null, error: any }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      return { data: result, error: null };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PostgresClient] Erro na transação:', error);
      return { data: null, error };
    } finally {
      client.release();
    }
  }
}

// Instância do cliente PostgreSQL
export const postgres = new PostgresClient(pool);

// Função para tratar erros do PostgreSQL
export function handlePostgresError(error: any): string {
  if (!error) return 'Erro desconhecido';
  
  // Códigos de erro comuns do PostgreSQL
  switch (error.code) {
    case '23505': return 'Registro duplicado';
    case '23503': return 'Violação de chave estrangeira';
    case '23502': return 'Valor não pode ser nulo';
    case '42P01': return 'Tabela não existe';
    case '42703': return 'Coluna não existe';
    default: return error.message || 'Erro desconhecido';
  }
}

export default postgres;
