import { postgres, handlePostgresError } from './postgresClient';
import { v4 as uuidv4 } from 'uuid';
import { CashRegisterSession, CashRegisterSessionStatus, CashAdjustment, CashAdjustmentType } from '../types';

// Função para buscar todas as sessões de caixa
export async function fetchCashSessions() {
  try {
    const { data, error } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .select()
      .orderBy('opened_at', 'DESC')
      .execute();
    
    if (error) {
      console.error('[CashService] Erro ao buscar sessões de caixa:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao buscar sessões de caixa:', error);
    return { data: null, error };
  }
}

// Função para buscar a sessão de caixa ativa
export async function fetchActiveCashSession() {
  try {
    const { data, error } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .select()
      .eq('status', CashRegisterSessionStatus.OPEN)
      .single()
      .execute();
    
    if (error) {
      // Se não encontrar sessão ativa, não é um erro crítico
      if (error.message && error.message.includes('Nenhum registro encontrado')) {
        return { data: null, error: null };
      }
      
      console.error('[CashService] Erro ao buscar sessão de caixa ativa:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao buscar sessão de caixa ativa:', error);
    return { data: null, error };
  }
}

// Função para abrir o caixa
export async function openCashRegister(openingBalance: number, notes?: string) {
  try {
    // Verificar se já existe uma sessão aberta
    const { data: activeSession } = await fetchActiveCashSession();
    
    if (activeSession) {
      return { 
        data: null, 
        error: new Error('Já existe uma sessão de caixa aberta. Feche a sessão atual antes de abrir uma nova.') 
      };
    }
    
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    const sessionData = {
      id: sessionId,
      opening_balance: openingBalance,
      closing_balance: null,
      closing_balance_informed: null,
      opened_at: now,
      closed_at: null,
      status: CashRegisterSessionStatus.OPEN,
      notes: notes || null,
      difference: null
    };
    
    const { data, error } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .insert(sessionData)
      .execute();
    
    if (error) {
      console.error('[CashService] Erro ao abrir caixa:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao abrir caixa:', error);
    return { data: null, error };
  }
}

// Função para fechar o caixa
export async function closeCashRegister(sessionId: string, closingBalanceInformed: number, notes?: string) {
  try {
    // Buscar a sessão
    const { data: sessionData, error: sessionError } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .select()
      .eq('id', sessionId)
      .single()
      .execute();
    
    if (sessionError || !sessionData) {
      console.error('[CashService] Erro ao buscar sessão para fechamento:', sessionError);
      return { data: null, error: sessionError || new Error('Sessão não encontrada') };
    }
    
    if (sessionData.status !== CashRegisterSessionStatus.OPEN) {
      return { data: null, error: new Error('Esta sessão de caixa já está fechada') };
    }
    
    // Calcular saldo de fechamento real com base em ajustes e pagamentos
    // Aqui você precisaria implementar a lógica para calcular o saldo real
    // com base nos pagamentos e ajustes realizados durante a sessão
    
    // Para simplificar, vamos usar o saldo informado como saldo real
    const closingBalance = closingBalanceInformed;
    const difference = closingBalance - closingBalanceInformed;
    
    const now = new Date().toISOString();
    
    const updateData = {
      closing_balance: closingBalance,
      closing_balance_informed: closingBalanceInformed,
      closed_at: now,
      status: CashRegisterSessionStatus.CLOSED,
      notes: notes ? (sessionData.notes ? `${sessionData.notes}\n${notes}` : notes) : sessionData.notes,
      difference
    };
    
    const { data, error } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .execute();
    
    if (error) {
      console.error('[CashService] Erro ao fechar caixa:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao fechar caixa:', error);
    return { data: null, error };
  }
}

// Função para buscar ajustes de caixa
export async function fetchCashAdjustments() {
  try {
    const { data, error } = await postgres.from<CashAdjustment>('cash_adjustments')
      .select()
      .orderBy('adjusted_at', 'DESC')
      .execute();
    
    if (error) {
      console.error('[CashService] Erro ao buscar ajustes de caixa:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao buscar ajustes de caixa:', error);
    return { data: null, error };
  }
}

// Função para adicionar um ajuste de caixa
export async function addCashAdjustment(sessionId: string, type: CashAdjustmentType, amount: number, reason: string) {
  try {
    // Verificar se a sessão existe e está aberta
    const { data: sessionData, error: sessionError } = await postgres.from<CashRegisterSession>('cash_register_sessions')
      .select()
      .eq('id', sessionId)
      .single()
      .execute();
    
    if (sessionError || !sessionData) {
      console.error('[CashService] Erro ao buscar sessão para ajuste:', sessionError);
      return { data: null, error: sessionError || new Error('Sessão não encontrada') };
    }
    
    if (sessionData.status !== CashRegisterSessionStatus.OPEN) {
      return { data: null, error: new Error('Não é possível adicionar ajustes a uma sessão fechada') };
    }
    
    const adjustmentId = uuidv4();
    const now = new Date().toISOString();
    
    const adjustmentData = {
      id: adjustmentId,
      session_id: sessionId,
      type,
      amount,
      reason,
      adjusted_at: now
    };
    
    const { data, error } = await postgres.from<CashAdjustment>('cash_adjustments')
      .insert(adjustmentData)
      .execute();
    
    if (error) {
      console.error('[CashService] Erro ao adicionar ajuste de caixa:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[CashService] Exceção ao adicionar ajuste de caixa:', error);
    return { data: null, error };
  }
}

// Exportar funções
export const cashService = {
  fetchCashSessions,
  fetchActiveCashSession,
  openCashRegister,
  closeCashRegister,
  fetchCashAdjustments,
  addCashAdjustment
};

export default cashService;
