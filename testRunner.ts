import { initService } from './services/initService';
import { testService } from './services/testService';

// Função principal para testar a integração com PostgreSQL
async function runTests() {
  console.log('Iniciando testes de integração com PostgreSQL...');
  
  // Testar conexão
  console.log('\n=== Teste de Conexão ===');
  const connectionTest = await testService.testConnection();
  console.log('Resultado:', connectionTest.success ? 'SUCESSO' : 'FALHA');
  if (connectionTest.message) {
    console.log('Mensagem:', connectionTest.message);
  }
  if (connectionTest.error) {
    console.error('Erro:', connectionTest.error);
  }
  
  // Inicializar banco de dados
  console.log('\n=== Inicialização do Banco de Dados ===');
  const initResult = await initService.initializeDatabase();
  console.log('Resultado:', initResult.success ? 'SUCESSO' : 'FALHA');
  if (initResult.error) {
    console.error('Erro:', initResult.error);
  }
  
  // Testar operações CRUD
  console.log('\n=== Teste de Operações CRUD ===');
  const crudTest = await testService.testCrudOperations();
  console.log('Resultado:', crudTest.success ? 'SUCESSO' : 'FALHA');
  if (crudTest.results) {
    console.log('Detalhes:');
    console.log('- Inserção:', crudTest.results.insert.success ? 'SUCESSO' : 'FALHA');
    console.log('- Consulta:', crudTest.results.select.success ? 'SUCESSO' : 'FALHA');
    console.log('- Atualização:', crudTest.results.update.success ? 'SUCESSO' : 'FALHA');
    console.log('- Exclusão:', crudTest.results.delete.success ? 'SUCESSO' : 'FALHA');
  }
  if (crudTest.error) {
    console.error('Erro:', crudTest.error);
  }
  
  // Testar transações
  console.log('\n=== Teste de Transações ===');
  const transactionTest = await testService.testTransactions();
  console.log('Resultado:', transactionTest.success ? 'SUCESSO' : 'FALHA');
  if (transactionTest.data) {
    console.log('Dados da transação processados com sucesso');
  }
  if (transactionTest.error) {
    console.error('Erro:', transactionTest.error);
  }
  
  console.log('\n=== Resumo dos Testes ===');
  const allTestsPassed = connectionTest.success && 
                         initResult.success && 
                         crudTest.success && 
                         transactionTest.success;
  
  console.log('Todos os testes:', allTestsPassed ? 'SUCESSO' : 'FALHA');
  
  return {
    success: allTestsPassed,
    details: {
      connection: connectionTest.success,
      initialization: initResult.success,
      crud: crudTest.success,
      transactions: transactionTest.success
    }
  };
}

// Executar testes
runTests()
  .then(result => {
    console.log('\nTestes concluídos!');
    console.log('Resultado final:', result.success ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM');
    console.log('Detalhes:', result.details);
    
    if (result.success) {
      console.log('\nO sistema está pronto para uso com PostgreSQL!');
    } else {
      console.error('\nAlguns testes falharam. Verifique os erros acima e corrija antes de prosseguir.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar testes:', error);
  });
