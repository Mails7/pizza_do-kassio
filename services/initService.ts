import { testService } from './testService';
import { postgres } from './postgresClient';

// Script para inicializar o banco de dados
export async function initializeDatabase() {
  try {
    console.log('Iniciando inicialização do banco de dados PostgreSQL...');
    
    // Testar conexão
    const connectionTest = await testService.testConnection();
    if (!connectionTest.success) {
      console.error('Falha ao conectar ao PostgreSQL:', connectionTest.error);
      return { success: false, error: connectionTest.error };
    }
    
    console.log('Conexão com PostgreSQL estabelecida com sucesso!');
    
    // Criar tabelas se não existirem
    await createTables();
    
    // Verificar se as tabelas foram criadas
    const tablesTest = await testService.testCreateTables();
    if (!tablesTest.success) {
      console.error('Falha ao verificar tabelas:', tablesTest.error);
      return { success: false, error: tablesTest.error };
    }
    
    console.log('Verificação de tabelas concluída:', tablesTest.results);
    
    // Testar operações CRUD
    const crudTest = await testService.testCrudOperations();
    if (!crudTest.success) {
      console.error('Falha nos testes CRUD:', crudTest.error);
      return { success: false, error: crudTest.error };
    }
    
    console.log('Testes CRUD concluídos com sucesso!');
    
    // Testar transações
    const transactionTest = await testService.testTransactions();
    if (!transactionTest.success) {
      console.error('Falha nos testes de transação:', transactionTest.error);
      return { success: false, error: transactionTest.error };
    }
    
    console.log('Testes de transação concluídos com sucesso!');
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro durante a inicialização do banco de dados:', error);
    return { success: false, error };
  }
}

// Função para criar as tabelas do banco de dados
async function createTables() {
  try {
    // Tabela de usuários
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de sessões
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Tabela de redefinição de senha
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Tabela de perfis (clientes)
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de categorias
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de itens de menu
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        image_url TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        item_type VARCHAR(50) DEFAULT 'regular',
        send_to_kitchen BOOLEAN DEFAULT TRUE,
        sizes JSONB,
        crusts JSONB,
        allow_half_and_half BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de mesas
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INTEGER,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de pedidos
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        order_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        order_type VARCHAR(50) NOT NULL,
        table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
        payment_method VARCHAR(50),
        amount_paid DECIMAL(10, 2),
        notes TEXT,
        auto_progress BOOLEAN DEFAULT TRUE,
        current_progress_percent INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de itens de pedido
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        selected_size_id VARCHAR(255),
        selected_crust_id VARCHAR(255),
        is_half_and_half BOOLEAN DEFAULT FALSE,
        first_half_flavor JSONB,
        second_half_flavor JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Tabela de sessões de caixa
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS cash_register_sessions (
        id UUID PRIMARY KEY,
        opening_balance DECIMAL(10, 2) NOT NULL,
        closing_balance DECIMAL(10, 2),
        closing_balance_informed DECIMAL(10, 2),
        opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
        closed_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        difference DECIMAL(10, 2)
      )
    `);
    
    // Tabela de ajustes de caixa
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS cash_adjustments (
        id UUID PRIMARY KEY,
        session_id UUID NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        adjusted_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Tabela de configurações do aplicativo
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id UUID PRIMARY KEY,
        store JSONB NOT NULL,
        order_flow JSONB NOT NULL,
        notifications JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('Todas as tabelas foram criadas com sucesso!');
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    return { success: false, error };
  }
}

// Exportar funções
export const initService = {
  initializeDatabase
};

export default initService;
