import { postgres, handlePostgresError } from './postgresClient';
import { v4 as uuidv4 } from 'uuid';
import { Profile, CustomerFormValues } from '../types';

// Função para buscar todos os perfis
export async function fetchProfiles() {
  try {
    const { data, error } = await postgres.from<Profile>('profiles')
      .select()
      .orderBy('full_name')
      .execute();
    
    if (error) {
      console.error('[ProfileService] Erro ao buscar perfis:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[ProfileService] Exceção ao buscar perfis:', error);
    return { data: null, error };
  }
}

// Função para buscar um perfil por ID
export async function fetchProfileById(profileId: string) {
  try {
    const { data, error } = await postgres.from<Profile>('profiles')
      .select()
      .eq('id', profileId)
      .single()
      .execute();
    
    if (error) {
      console.error('[ProfileService] Erro ao buscar perfil por ID:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[ProfileService] Exceção ao buscar perfil por ID:', error);
    return { data: null, error };
  }
}

// Função para adicionar um perfil
export async function addProfile(profileData: CustomerFormValues) {
  try {
    const profileId = uuidv4();
    const now = new Date().toISOString();
    
    const newProfile = {
      id: profileId,
      full_name: profileData.fullName || '',
      phone: profileData.phone || null,
      email: profileData.email || null,
      address: profileData.address || null,
      notes: profileData.notes || null,
      created_at: now,
      updated_at: now
    };
    
    const { data, error } = await postgres.from<Profile>('profiles')
      .insert(newProfile)
      .execute();
    
    if (error) {
      console.error('[ProfileService] Erro ao adicionar perfil:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[ProfileService] Exceção ao adicionar perfil:', error);
    return { data: null, error };
  }
}

// Função para atualizar um perfil
export async function updateProfile(profileId: string, profileData: Partial<CustomerFormValues>) {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (profileData.fullName !== undefined) updateData.full_name = profileData.fullName;
    if (profileData.phone !== undefined) updateData.phone = profileData.phone;
    if (profileData.email !== undefined) updateData.email = profileData.email;
    if (profileData.address !== undefined) updateData.address = profileData.address;
    if (profileData.notes !== undefined) updateData.notes = profileData.notes;
    
    const { data, error } = await postgres.from<Profile>('profiles')
      .update(updateData)
      .eq('id', profileId)
      .execute();
    
    if (error) {
      console.error('[ProfileService] Erro ao atualizar perfil:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[ProfileService] Exceção ao atualizar perfil:', error);
    return { data: null, error };
  }
}

// Função para excluir um perfil
export async function deleteProfile(profileId: string) {
  try {
    // Verificar se o perfil está associado a pedidos
    const { count, error: countError } = await postgres.from('orders')
      .select()
      .eq('customer_id', profileId)
      .count();
    
    if (countError) {
      console.error('[ProfileService] Erro ao verificar pedidos associados:', countError);
      return { success: false, error: countError };
    }
    
    if (count && count > 0) {
      return { 
        success: false, 
        error: new Error(`Não é possível excluir este perfil pois está associado a ${count} pedido(s)`) 
      };
    }
    
    const { error } = await postgres.from<Profile>('profiles')
      .delete()
      .eq('id', profileId)
      .execute();
    
    if (error) {
      console.error('[ProfileService] Erro ao excluir perfil:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[ProfileService] Exceção ao excluir perfil:', error);
    return { success: false, error };
  }
}

// Exportar funções
export const profileService = {
  fetchProfiles,
  fetchProfileById,
  addProfile,
  updateProfile,
  deleteProfile
};

export default profileService;
