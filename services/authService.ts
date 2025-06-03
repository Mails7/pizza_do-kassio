import { postgres, handlePostgresError } from './postgresClient';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Tipos para autenticação
interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

interface PasswordReset {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

interface SignUpResult {
  user: Omit<User, 'password_hash'> | null;
  session: Session | null;
  error: Error | null;
}

interface SignInResult {
  user: Omit<User, 'password_hash'> | null;
  session: Session | null;
  error: Error | null;
}

interface SessionResult {
  session: Session | null;
  user: Omit<User, 'password_hash'> | null;
  error: Error | null;
}

// Função para registrar um novo usuário
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string
): Promise<SignUpResult> {
  try {
    // Verificar se o email já está em uso
    const { data: existingUsers } = await postgres
      .from<User>('users')
      .select()
      .eq('email', email)
      .execute();
    
    if (existingUsers && existingUsers.length > 0) {
      return {
        user: null,
        session: null,
        error: new Error('Este email já está em uso')
      };
    }
    
    // Gerar hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Criar usuário
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const { data: users, error: userError } = await postgres
      .from<User>('users')
      .insert({
        id: userId,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        created_at: now,
        updated_at: now
      })
      .execute();
    
    if (userError || !users || users.length === 0) {
      return {
        user: null,
        session: null,
        error: new Error(`Erro ao criar usuário: ${handlePostgresError(userError)}`)
      };
    }
    
    // Criar sessão
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Sessão válida por 7 dias
    
    const { data: sessions, error: sessionError } = await postgres
      .from<Session>('sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        created_at: now,
        expires_at: expiresAt.toISOString()
      })
      .execute();
    
    if (sessionError || !sessions || sessions.length === 0) {
      return {
        user: null,
        session: null,
        error: new Error(`Erro ao criar sessão: ${handlePostgresError(sessionError)}`)
      };
    }
    
    // Retornar usuário e sessão
    const { password_hash, ...userWithoutPassword } = users[0];
    
    return {
      user: userWithoutPassword,
      session: sessions[0],
      error: null
    };
  } catch (error) {
    console.error('[AuthService] Erro ao registrar usuário:', error);
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('Erro desconhecido ao registrar usuário')
    };
  }
}

// Função para fazer login
export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    // Buscar usuário pelo email
    const { data: users, error: userError } = await postgres
      .from<User>('users')
      .select()
      .eq('email', email)
      .execute();
    
    if (userError || !users || users.length === 0) {
      return {
        user: null,
        session: null,
        error: new Error('Email ou senha incorretos')
      };
    }
    
    const user = users[0];
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return {
        user: null,
        session: null,
        error: new Error('Email ou senha incorretos')
      };
    }
    
    // Criar sessão
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Sessão válida por 7 dias
    
    const { data: sessions, error: sessionError } = await postgres
      .from<Session>('sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        created_at: now,
        expires_at: expiresAt.toISOString()
      })
      .execute();
    
    if (sessionError || !sessions || sessions.length === 0) {
      return {
        user: null,
        session: null,
        error: new Error(`Erro ao criar sessão: ${handlePostgresError(sessionError)}`)
      };
    }
    
    // Retornar usuário e sessão
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      session: sessions[0],
      error: null
    };
  } catch (error) {
    console.error('[AuthService] Erro ao fazer login:', error);
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('Erro desconhecido ao fazer login')
    };
  }
}

// Função para fazer logout
export async function signOut(sessionId: string): Promise<{ error: Error | null }> {
  try {
    // Excluir sessão
    const { error } = await postgres
      .from<Session>('sessions')
      .delete()
      .eq('id', sessionId)
      .execute();
    
    if (error) {
      return { error: new Error(`Erro ao fazer logout: ${handlePostgresError(error)}`) };
    }
    
    return { error: null };
  } catch (error) {
    console.error('[AuthService] Erro ao fazer logout:', error);
    return { error: error instanceof Error ? error : new Error('Erro desconhecido ao fazer logout') };
  }
}

// Função para verificar sessão
export async function getSession(sessionId: string): Promise<SessionResult> {
  try {
    // Buscar sessão
    const { data: sessions, error: sessionError } = await postgres
      .from<Session>('sessions')
      .select()
      .eq('id', sessionId)
      .execute();
    
    if (sessionError || !sessions || sessions.length === 0) {
      return {
        session: null,
        user: null,
        error: new Error('Sessão não encontrada ou expirada')
      };
    }
    
    const session = sessions[0];
    
    // Verificar se a sessão expirou
    if (new Date(session.expires_at) < new Date()) {
      // Excluir sessão expirada
      await postgres
        .from<Session>('sessions')
        .delete()
        .eq('id', sessionId)
        .execute();
      
      return {
        session: null,
        user: null,
        error: new Error('Sessão expirada')
      };
    }
    
    // Buscar usuário
    const { data: users, error: userError } = await postgres
      .from<User>('users')
      .select()
      .eq('id', session.user_id)
      .execute();
    
    if (userError || !users || users.length === 0) {
      return {
        session: null,
        user: null,
        error: new Error('Usuário não encontrado')
      };
    }
    
    // Retornar sessão e usuário
    const { password_hash, ...userWithoutPassword } = users[0];
    
    return {
      session,
      user: userWithoutPassword,
      error: null
    };
  } catch (error) {
    console.error('[AuthService] Erro ao verificar sessão:', error);
    return {
      session: null,
      user: null,
      error: error instanceof Error ? error : new Error('Erro desconhecido ao verificar sessão')
    };
  }
}

// Função para solicitar redefinição de senha
export async function requestPasswordReset(email: string): Promise<{ success: boolean, error: Error | null }> {
  try {
    // Buscar usuário pelo email
    const { data: users, error: userError } = await postgres
      .from<User>('users')
      .select()
      .eq('email', email)
      .execute();
    
    if (userError || !users || users.length === 0) {
      // Não informar ao usuário que o email não existe por questões de segurança
      return { success: true, error: null };
    }
    
    const user = users[0];
    
    // Gerar token
    const resetId = uuidv4();
    const token = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token válido por 24 horas
    
    // Excluir tokens existentes para este usuário
    await postgres
      .from<PasswordReset>('password_resets')
      .delete()
      .eq('user_id', user.id)
      .execute();
    
    // Criar novo token
    const { error: resetError } = await postgres
      .from<PasswordReset>('password_resets')
      .insert({
        id: resetId,
        user_id: user.id,
        token,
        created_at: now,
        expires_at: expiresAt.toISOString()
      })
      .execute();
    
    if (resetError) {
      return {
        success: false,
        error: new Error(`Erro ao criar token de redefinição: ${handlePostgresError(resetError)}`)
      };
    }
    
    // Aqui você enviaria um email com o link de redefinição
    // Por exemplo: `https://seu-site.com/reset-password?token=${token}`
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[AuthService] Erro ao solicitar redefinição de senha:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Erro desconhecido ao solicitar redefinição de senha')
    };
  }
}

// Função para redefinir senha
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean, error: Error | null }> {
  try {
    // Buscar token
    const { data: resets, error: resetError } = await postgres
      .from<PasswordReset>('password_resets')
      .select()
      .eq('token', token)
      .execute();
    
    if (resetError || !resets || resets.length === 0) {
      return {
        success: false,
        error: new Error('Token inválido ou expirado')
      };
    }
    
    const reset = resets[0];
    
    // Verificar se o token expirou
    if (new Date(reset.expires_at) < new Date()) {
      // Excluir token expirado
      await postgres
        .from<PasswordReset>('password_resets')
        .delete()
        .eq('id', reset.id)
        .execute();
      
      return {
        success: false,
        error: new Error('Token expirado')
      };
    }
    
    // Gerar hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Atualizar senha do usuário
    const { error: updateError } = await postgres
      .from<User>('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', reset.user_id)
      .execute();
    
    if (updateError) {
      return {
        success: false,
        error: new Error(`Erro ao atualizar senha: ${handlePostgresError(updateError)}`)
      };
    }
    
    // Excluir token usado
    await postgres
      .from<PasswordReset>('password_resets')
      .delete()
      .eq('id', reset.id)
      .execute();
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[AuthService] Erro ao redefinir senha:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Erro desconhecido ao redefinir senha')
    };
  }
}

// Exportar funções
export const authService = {
  signUp,
  signIn,
  signOut,
  getSession,
  requestPasswordReset,
  resetPassword
};

export default authService;
