import { postgres, handlePostgresError } from './postgresClient';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, defaultAppSettings } from '../types';

// Função para buscar as configurações do sistema
export async function fetchSettings() {
  try {
    const { data, error } = await postgres.from<AppSettings>('app_settings')
      .select()
      .limit(1)
      .single()
      .execute();
    
    if (error) {
      // Se a tabela não existir, criar com configurações padrão
      if (error.message && error.message.includes('relation "app_settings" does not exist')) {
        return await createSettingsTable();
      }
      
      // Se não encontrar configurações, criar com valores padrão
      if (error.message && error.message.includes('Nenhum registro encontrado')) {
        return await createDefaultSettings();
      }
      
      console.error('[SettingsService] Erro ao buscar configurações:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[SettingsService] Exceção ao buscar configurações:', error);
    return { data: null, error };
  }
}

// Função para criar a tabela de configurações
async function createSettingsTable() {
  try {
    // Criar tabela
    const { error: createError } = await postgres.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id UUID PRIMARY KEY,
        store JSONB,
        order_flow JSONB,
        notifications JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    if (createError) {
      console.error('[SettingsService] Erro ao criar tabela de configurações:', createError);
      return { data: null, error: createError, tableMissing: true };
    }
    
    // Inserir configurações padrão
    return await createDefaultSettings();
  } catch (error) {
    console.error('[SettingsService] Exceção ao criar tabela de configurações:', error);
    return { data: null, error, tableMissing: true };
  }
}

// Função para criar configurações padrão
async function createDefaultSettings() {
  try {
    const settingsId = uuidv4();
    const now = new Date().toISOString();
    
    const settingsData = {
      id: settingsId,
      store: defaultAppSettings.store,
      order_flow: defaultAppSettings.order_flow,
      notifications: defaultAppSettings.notifications,
      created_at: now,
      updated_at: now
    };
    
    const { data, error } = await postgres.from<AppSettings>('app_settings')
      .insert(settingsData)
      .execute();
    
    if (error) {
      console.error('[SettingsService] Erro ao criar configurações padrão:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[SettingsService] Exceção ao criar configurações padrão:', error);
    return { data: null, error };
  }
}

// Função para atualizar as configurações
export async function updateSettings(newSettings: AppSettings) {
  try {
    // Buscar configurações atuais
    const { data: currentSettings, error: fetchError } = await fetchSettings();
    
    if (fetchError) {
      console.error('[SettingsService] Erro ao buscar configurações para atualização:', fetchError);
      return { success: false, error: fetchError };
    }
    
    const updateData = {
      store: newSettings.store || currentSettings?.store || defaultAppSettings.store,
      order_flow: newSettings.order_flow || currentSettings?.order_flow || defaultAppSettings.order_flow,
      notifications: newSettings.notifications || currentSettings?.notifications || defaultAppSettings.notifications,
      updated_at: new Date().toISOString()
    };
    
    const { error: updateError } = await postgres.from<AppSettings>('app_settings')
      .update(updateData)
      .eq('id', currentSettings?.id || '')
      .execute();
    
    if (updateError) {
      console.error('[SettingsService] Erro ao atualizar configurações:', updateError);
      return { success: false, error: updateError };
    }
    
    // Buscar configurações atualizadas
    const { data: updatedSettings, error: refetchError } = await fetchSettings();
    
    if (refetchError) {
      console.error('[SettingsService] Erro ao buscar configurações atualizadas:', refetchError);
      return { success: true, data: updateData, error: null };
    }
    
    return { success: true, data: updatedSettings, error: null };
  } catch (error) {
    console.error('[SettingsService] Exceção ao atualizar configurações:', error);
    return { success: false, error };
  }
}

// Exportar funções
export const settingsService = {
  fetchSettings,
  updateSettings
};

export default settingsService;
