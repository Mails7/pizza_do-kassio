import { postgres } from './postgresClient';

// Função para testar a conexão com o PostgreSQL
export async function testConnection() {
  try {
    const { data, error } = await postgres.query('SELECT NOW() as current_time');
    
    if (error) {
      console.error('[TestService] Erro ao testar conexão:', error);
      return { success: false, error };
    }
    
    return { 
      success: true, 
      message: `Conexão com PostgreSQL estabelecida com sucesso! Hora do servidor: ${data?.[0]?.current_time}`,
      error: null 
    };
  } catch (error) {
    console.error('[TestService] Exceção ao testar conexão:', error);
    return { success: false, error };
  }
}

// Função para testar a criação de tabelas
export async function testCreateTables() {
  try {
    // Verificar se as tabelas existem
    const tables = [
      'users',
      'sessions',
      'profiles',
      'categories',
      'menu_items',
      'tables',
      'orders',
      'order_items',
      'cash_register_sessions',
      'cash_adjustments',
      'app_settings'
    ];
    
    const results = {};
    
    for (const table of tables) {
      const { data, error } = await postgres.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists`,
        [table]
      );
      
      results[table] = {
        exists: data?.[0]?.exists || false,
        error: error ? handleError(error) : null
      };
    }
    
    return { success: true, results, error: null };
  } catch (error) {
    console.error('[TestService] Exceção ao testar tabelas:', error);
    return { success: false, results: {}, error };
  }
}

// Função para testar operações CRUD básicas
export async function testCrudOperations() {
  try {
    const results = {};
    
    // Teste: Inserir categoria
    const testCategoryId = 'test-category-' + Date.now();
    const { data: insertedCategory, error: insertError } = await postgres.query(
      `INSERT INTO categories (id, name, created_at) 
       VALUES ($1, $2, NOW()) 
       RETURNING *`,
      [testCategoryId, 'Categoria de Teste']
    );
    
    results.insert = {
      success: !insertError && insertedCategory && insertedCategory.length > 0,
      data: insertedCategory?.[0] || null,
      error: insertError ? handleError(insertError) : null
    };
    
    // Teste: Buscar categoria
    const { data: fetchedCategory, error: fetchError } = await postgres.query(
      `SELECT * FROM categories WHERE id = $1`,
      [testCategoryId]
    );
    
    results.select = {
      success: !fetchError && fetchedCategory && fetchedCategory.length > 0,
      data: fetchedCategory?.[0] || null,
      error: fetchError ? handleError(fetchError) : null
    };
    
    // Teste: Atualizar categoria
    const { data: updatedCategory, error: updateError } = await postgres.query(
      `UPDATE categories SET name = $1 WHERE id = $2 RETURNING *`,
      ['Categoria de Teste Atualizada', testCategoryId]
    );
    
    results.update = {
      success: !updateError && updatedCategory && updatedCategory.length > 0,
      data: updatedCategory?.[0] || null,
      error: updateError ? handleError(updateError) : null
    };
    
    // Teste: Excluir categoria
    const { data: deletedCategory, error: deleteError } = await postgres.query(
      `DELETE FROM categories WHERE id = $1 RETURNING *`,
      [testCategoryId]
    );
    
    results.delete = {
      success: !deleteError && deletedCategory && deletedCategory.length > 0,
      data: deletedCategory?.[0] || null,
      error: deleteError ? handleError(deleteError) : null
    };
    
    return { 
      success: results.insert.success && results.select.success && 
               results.update.success && results.delete.success,
      results,
      error: null
    };
  } catch (error) {
    console.error('[TestService] Exceção ao testar operações CRUD:', error);
    return { success: false, results: {}, error };
  }
}

// Função para testar transações
export async function testTransactions() {
  try {
    // Iniciar transação
    return await postgres.transaction(async (client) => {
      try {
        // Criar categoria de teste
        const testCategoryId = 'test-transaction-' + Date.now();
        
        const { rows: insertedCategory } = await client.query(
          `INSERT INTO categories (id, name, created_at) 
           VALUES ($1, $2, NOW()) 
           RETURNING *`,
          [testCategoryId, 'Categoria de Transação']
        );
        
        // Criar item de menu de teste
        const testItemId = 'test-item-' + Date.now();
        
        const { rows: insertedItem } = await client.query(
          `INSERT INTO menu_items (
            id, name, price, category_id, created_at
          ) VALUES ($1, $2, $3, $4, NOW()) 
          RETURNING *`,
          [testItemId, 'Item de Transação', 10.99, testCategoryId]
        );
        
        // Buscar item com categoria
        const { rows: fetchedItem } = await client.query(
          `SELECT m.*, c.name as category_name 
           FROM menu_items m 
           JOIN categories c ON m.category_id = c.id 
           WHERE m.id = $1`,
          [testItemId]
        );
        
        // Limpar dados de teste
        await client.query('DELETE FROM menu_items WHERE id = $1', [testItemId]);
        await client.query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
        
        return { 
          success: true, 
          data: {
            category: insertedCategory?.[0] || null,
            item: insertedItem?.[0] || null,
            joined: fetchedItem?.[0] || null
          },
          error: null
        };
      } catch (error) {
        console.error('[TestService] Erro na transação:', error);
        throw error; // Propagar erro para rollback
      }
    });
  } catch (error) {
    console.error('[TestService] Exceção ao testar transações:', error);
    return { success: false, data: null, error };
  }
}

// Função auxiliar para tratar erros
function handleError(error) {
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

// Exportar funções
export const testService = {
  testConnection,
  testCreateTables,
  testCrudOperations,
  testTransactions
};

export default testService;
