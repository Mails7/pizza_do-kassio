import { postgres } from './postgresClient';

// Script para criar as tabelas necessárias no PostgreSQL
export async function createDatabaseSchema() {
  try {
    console.log('[SchemaService] Iniciando criação do esquema de banco de dados...');
    
    // Criar tabela de usuários
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
    console.log('[SchemaService] Tabela users criada com sucesso');
    
    // Criar tabela de sessões
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('[SchemaService] Tabela sessions criada com sucesso');
    
    // Criar tabela de redefinição de senha
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('[SchemaService] Tabela password_resets criada com sucesso');
    
    // Criar tabela de perfis
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('[SchemaService] Tabela profiles criada com sucesso');
    
    // Criar tabela de categorias
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('[SchemaService] Tabela categories criada com sucesso');
    
    // Criar tabela de itens de menu
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
    console.log('[SchemaService] Tabela menu_items criada com sucesso');
    
    // Criar tabela de mesas
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
    console.log('[SchemaService] Tabela tables criada com sucesso');
    
    // Criar tabela de pedidos
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
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
        next_auto_transition_time TIMESTAMP WITH TIME ZONE,
        current_progress_percent INTEGER DEFAULT 0
      )
    `);
    console.log('[SchemaService] Tabela orders criada com sucesso');
    
    // Criar tabela de itens de pedido
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        selected_size_id UUID,
        selected_crust_id UUID,
        is_half_and_half BOOLEAN DEFAULT FALSE,
        first_half_flavor JSONB,
        second_half_flavor JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('[SchemaService] Tabela order_items criada com sucesso');
    
    // Criar tabela de sessões de caixa
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
    console.log('[SchemaService] Tabela cash_register_sessions criada com sucesso');
    
    // Criar tabela de ajustes de caixa
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS cash_adjustments (
        id UUID PRIMARY KEY,
        session_id UUID NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT NOT NULL,
        adjusted_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('[SchemaService] Tabela cash_adjustments criada com sucesso');
    
    // Criar tabela de configurações
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
    console.log('[SchemaService] Tabela app_settings criada com sucesso');
    
    console.log('[SchemaService] Esquema de banco de dados criado com sucesso!');
    return { success: true, message: 'Esquema de banco de dados criado com sucesso!' };
  } catch (error) {
    console.error('[SchemaService] Erro ao criar esquema de banco de dados:', error);
    return { 
      success: false, 
      message: `Erro ao criar esquema de banco de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      error 
    };
  }
}

// Exportar funções
export const schemaService = {
  createDatabaseSchema
};

export default schemaService;
