import { postgres } from './postgresClient';
import { testService } from './testService';
import { initService } from './initService';
import { dataService } from './dataService';
import { authService } from './authService';
import { profileService } from './profileService';
import { cashService } from './cashService';
import { settingsService } from './settingsService';

// Função para executar testes integrados
export async function runIntegrationTests() {
  try {
    console.log('[TestRunner] Iniciando testes integrados...');
    const results = {
      connection: { success: false, message: '', data: null },
      initialization: { success: false, message: '' },
      auth: { success: false, message: '' },
      profiles: { success: false, message: '' },
      categories: { success: false, message: '' },
      menuItems: { success: false, message: '' },
      tables: { success: false, message: '' },
      orders: { success: false, message: '' },
      cash: { success: false, message: '' },
      settings: { success: false, message: '' }
    };
    
    // Teste de conexão
    console.log('[TestRunner] Testando conexão com PostgreSQL...');
    const connectionTest = await testService.testConnection();
    results.connection = {
      success: connectionTest.success,
      message: connectionTest.message,
      data: connectionTest.data
    };
    
    if (!connectionTest.success) {
      console.error('[TestRunner] Falha no teste de conexão:', connectionTest.message);
      return results;
    }
    
    console.log('[TestRunner] Teste de conexão concluído com sucesso');
    
    // Inicialização do banco de dados
    console.log('[TestRunner] Inicializando banco de dados...');
    const initResult = await initService.initializeDatabase();
    results.initialization = {
      success: initResult.success,
      message: initResult.message
    };
    
    if (!initResult.success) {
      console.error('[TestRunner] Falha na inicialização do banco de dados:', initResult.message);
      return results;
    }
    
    console.log('[TestRunner] Inicialização do banco de dados concluída com sucesso');
    
    // Teste de autenticação
    console.log('[TestRunner] Testando serviço de autenticação...');
    try {
      // Registrar usuário de teste
      const registerResult = await authService.signUp(
        'teste@example.com',
        'senha123',
        'Usuário de Teste',
        '123456789'
      );
      
      if (!registerResult.user) {
        throw new Error(`Falha ao registrar usuário: ${registerResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Login com usuário de teste
      const loginResult = await authService.signIn('teste@example.com', 'senha123');
      
      if (!loginResult.user) {
        throw new Error(`Falha ao fazer login: ${loginResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Verificar sessão
      const sessionResult = await authService.getSession(loginResult.session!.id);
      
      if (!sessionResult.session) {
        throw new Error(`Falha ao verificar sessão: ${sessionResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Logout
      const logoutResult = await authService.signOut(loginResult.session!.id);
      
      if (logoutResult.error) {
        throw new Error(`Falha ao fazer logout: ${logoutResult.error.message || 'Erro desconhecido'}`);
      }
      
      results.auth = {
        success: true,
        message: 'Testes de autenticação concluídos com sucesso'
      };
      
      console.log('[TestRunner] Testes de autenticação concluídos com sucesso');
    } catch (error) {
      console.error('[TestRunner] Falha nos testes de autenticação:', error);
      results.auth = {
        success: false,
        message: `Falha nos testes de autenticação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
    
    // Teste de perfis
    console.log('[TestRunner] Testando serviço de perfis...');
    try {
      // Adicionar perfil
      const addProfileResult = await profileService.addProfile({
        fullName: 'Cliente de Teste',
        phone: '987654321',
        email: 'cliente@example.com',
        address: 'Rua de Teste, 123',
        notes: 'Perfil de teste'
      });
      
      if (!addProfileResult.data) {
        throw new Error(`Falha ao adicionar perfil: ${addProfileResult.error?.message || 'Erro desconhecido'}`);
      }
      
      const profileId = addProfileResult.data.id;
      
      // Buscar perfil por ID
      const fetchProfileResult = await profileService.fetchProfileById(profileId);
      
      if (!fetchProfileResult.data) {
        throw new Error(`Falha ao buscar perfil: ${fetchProfileResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Atualizar perfil
      const updateProfileResult = await profileService.updateProfile(profileId, {
        fullName: 'Cliente de Teste Atualizado',
        notes: 'Perfil de teste atualizado'
      });
      
      if (!updateProfileResult.data) {
        throw new Error(`Falha ao atualizar perfil: ${updateProfileResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Buscar todos os perfis
      const fetchProfilesResult = await profileService.fetchProfiles();
      
      if (!fetchProfilesResult.data) {
        throw new Error(`Falha ao buscar perfis: ${fetchProfilesResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Excluir perfil
      const deleteProfileResult = await profileService.deleteProfile(profileId);
      
      if (!deleteProfileResult.success) {
        throw new Error(`Falha ao excluir perfil: ${deleteProfileResult.error?.message || 'Erro desconhecido'}`);
      }
      
      results.profiles = {
        success: true,
        message: 'Testes de perfis concluídos com sucesso'
      };
      
      console.log('[TestRunner] Testes de perfis concluídos com sucesso');
    } catch (error) {
      console.error('[TestRunner] Falha nos testes de perfis:', error);
      results.profiles = {
        success: false,
        message: `Falha nos testes de perfis: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
    
    // Teste de categorias
    console.log('[TestRunner] Testando serviço de categorias...');
    try {
      // Adicionar categoria
      const addCategoryResult = await dataService.addCategory('Categoria de Teste');
      
      if (!addCategoryResult.data) {
        throw new Error(`Falha ao adicionar categoria: ${addCategoryResult.error?.message || 'Erro desconhecido'}`);
      }
      
      const categoryId = addCategoryResult.data.id;
      
      // Buscar categorias
      const fetchCategoriesResult = await dataService.fetchCategories();
      
      if (!fetchCategoriesResult.data) {
        throw new Error(`Falha ao buscar categorias: ${fetchCategoriesResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Atualizar categoria
      const updateCategoryResult = await dataService.updateCategory({
        id: categoryId,
        name: 'Categoria de Teste Atualizada',
        created_at: addCategoryResult.data.created_at
      });
      
      if (!updateCategoryResult.data) {
        throw new Error(`Falha ao atualizar categoria: ${updateCategoryResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Excluir categoria
      const deleteCategoryResult = await dataService.deleteCategory(categoryId);
      
      if (deleteCategoryResult.error) {
        throw new Error(`Falha ao excluir categoria: ${deleteCategoryResult.error.message || 'Erro desconhecido'}`);
      }
      
      results.categories = {
        success: true,
        message: 'Testes de categorias concluídos com sucesso'
      };
      
      console.log('[TestRunner] Testes de categorias concluídos com sucesso');
    } catch (error) {
      console.error('[TestRunner] Falha nos testes de categorias:', error);
      results.categories = {
        success: false,
        message: `Falha nos testes de categorias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
    
    // Teste de configurações
    console.log('[TestRunner] Testando serviço de configurações...');
    try {
      // Buscar configurações
      const fetchSettingsResult = await settingsService.fetchSettings();
      
      if (!fetchSettingsResult.data) {
        throw new Error(`Falha ao buscar configurações: ${fetchSettingsResult.error?.message || 'Erro desconhecido'}`);
      }
      
      // Atualizar configurações
      const updateSettingsResult = await settingsService.updateSettings({
        store: {
          ...fetchSettingsResult.data.store,
          name: 'Pizzaria de Teste',
          phone: '123456789'
        },
        order_flow: fetchSettingsResult.data.order_flow,
        notifications: fetchSettingsResult.data.notifications
      });
      
      if (!updateSettingsResult.success) {
        throw new Error(`Falha ao atualizar configurações: ${updateSettingsResult.error?.message || 'Erro desconhecido'}`);
      }
      
      results.settings = {
        success: true,
        message: 'Testes de configurações concluídos com sucesso'
      };
      
      console.log('[TestRunner] Testes de configurações concluídos com sucesso');
    } catch (error) {
      console.error('[TestRunner] Falha nos testes de configurações:', error);
      results.settings = {
        success: false,
        message: `Falha nos testes de configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
    
    console.log('[TestRunner] Testes integrados concluídos');
    return results;
  } catch (error) {
    console.error('[TestRunner] Erro ao executar testes integrados:', error);
    return {
      success: false,
      message: `Erro ao executar testes integrados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      error
    };
  }
}

// Exportar funções
export const testRunner = {
  runIntegrationTests
};

export default testRunner;
