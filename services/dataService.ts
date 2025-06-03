import { postgres, handlePostgresError } from './postgresClient';
import { v4 as uuidv4 } from 'uuid';
import { Category, MenuItem, Table, Order, OrderItem, OrderStatus, CustomerDetails, ManualOrderData } from '../types';

// Função para buscar todas as categorias
export async function fetchCategories() {
  try {
    const { data, error } = await postgres.from<Category>('categories')
      .select()
      .orderBy('name')
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao buscar categorias:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao buscar categorias:', error);
    return { data: null, error };
  }
}

// Função para adicionar uma categoria
export async function addCategory(name: string) {
  try {
    const categoryId = uuidv4();
    const now = new Date().toISOString();
    
    const categoryData = {
      id: categoryId,
      name,
      created_at: now
    };
    
    const { data, error } = await postgres.from<Category>('categories')
      .insert(categoryData)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao adicionar categoria:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao adicionar categoria:', error);
    return { data: null, error };
  }
}

// Função para atualizar uma categoria
export async function updateCategory(category: Category) {
  try {
    const { data, error } = await postgres.from<Category>('categories')
      .update({ name: category.name })
      .eq('id', category.id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao atualizar categoria:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao atualizar categoria:', error);
    return { data: null, error };
  }
}

// Função para excluir uma categoria
export async function deleteCategory(id: string) {
  try {
    // Verificar se existem itens de menu associados a esta categoria
    const { count, error: countError } = await postgres.from('menu_items')
      .select()
      .eq('category_id', id)
      .count();
    
    if (countError) {
      console.error('[DataService] Erro ao verificar itens associados:', countError);
      return { success: false, error: countError };
    }
    
    if (count && count > 0) {
      return { 
        success: false, 
        error: new Error(`Não é possível excluir esta categoria pois está associada a ${count} item(ns) de menu`) 
      };
    }
    
    const { error } = await postgres.from<Category>('categories')
      .delete()
      .eq('id', id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao excluir categoria:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao excluir categoria:', error);
    return { success: false, error };
  }
}

// Função para buscar todos os itens de menu
export async function fetchMenuItems() {
  try {
    const { data, error } = await postgres.from<MenuItem>('menu_items')
      .select()
      .orderBy('name')
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao buscar itens de menu:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao buscar itens de menu:', error);
    return { data: null, error };
  }
}

// Função para adicionar um item de menu
export async function addMenuItem(item: Omit<MenuItem, 'id' | 'created_at'>) {
  try {
    const itemId = uuidv4();
    const now = new Date().toISOString();
    
    const itemData = {
      id: itemId,
      name: item.name,
      description: item.description || null,
      price: item.price,
      category_id: item.category_id || null,
      image_url: item.image_url || null,
      is_available: item.available !== undefined ? item.available : true,
      item_type: item.item_type || 'regular',
      send_to_kitchen: item.send_to_kitchen !== undefined ? item.send_to_kitchen : true,
      sizes: item.sizes || null,
      allow_half_and_half: item.allow_half_and_half !== undefined ? item.allow_half_and_half : false,
      created_at: now
    };
    
    const { data, error } = await postgres.from<MenuItem>('menu_items')
      .insert(itemData)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao adicionar item de menu:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao adicionar item de menu:', error);
    return { data: null, error };
  }
}

// Função para atualizar um item de menu
export async function updateMenuItem(id: string, item: Partial<MenuItem>) {
  try {
    const updateData: any = {};
    
    if (item.name !== undefined) updateData.name = item.name;
    if (item.description !== undefined) updateData.description = item.description;
    if (item.price !== undefined) updateData.price = item.price;
    if (item.category_id !== undefined) updateData.category_id = item.category_id;
    if (item.image_url !== undefined) updateData.image_url = item.image_url;
    if (item.available !== undefined) updateData.is_available = item.available;
    if (item.item_type !== undefined) updateData.item_type = item.item_type;
    if (item.send_to_kitchen !== undefined) updateData.send_to_kitchen = item.send_to_kitchen;
    if (item.sizes !== undefined) updateData.sizes = item.sizes;
    if (item.allow_half_and_half !== undefined) updateData.allow_half_and_half = item.allow_half_and_half;
    
    const { data, error } = await postgres.from<MenuItem>('menu_items')
      .update(updateData)
      .eq('id', id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao atualizar item de menu:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao atualizar item de menu:', error);
    return { data: null, error };
  }
}

// Função para excluir um item de menu
export async function deleteMenuItem(id: string) {
  try {
    // Verificar se o item está associado a pedidos
    const { count, error: countError } = await postgres.from('order_items')
      .select()
      .eq('menu_item_id', id)
      .count();
    
    if (countError) {
      console.error('[DataService] Erro ao verificar pedidos associados:', countError);
      return { success: false, error: countError };
    }
    
    if (count && count > 0) {
      return { 
        success: false, 
        error: new Error(`Não é possível excluir este item pois está associado a ${count} pedido(s)`) 
      };
    }
    
    const { error } = await postgres.from<MenuItem>('menu_items')
      .delete()
      .eq('id', id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao excluir item de menu:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao excluir item de menu:', error);
    return { success: false, error };
  }
}

// Função para buscar todas as mesas
export async function fetchTables() {
  try {
    const { data, error } = await postgres.from<Table>('tables')
      .select()
      .orderBy('name')
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao buscar mesas:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao buscar mesas:', error);
    return { data: null, error };
  }
}

// Função para adicionar uma mesa
export async function addTable(tableData: Omit<Table, 'status' | 'id' | 'created_at'>) {
  try {
    const tableId = uuidv4();
    const now = new Date().toISOString();
    
    const newTable = {
      id: tableId,
      name: tableData.name,
      capacity: tableData.capacity || null,
      location: tableData.location || null,
      status: 'available',
      created_at: now
    };
    
    const { data, error } = await postgres.from<Table>('tables')
      .insert(newTable)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao adicionar mesa:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao adicionar mesa:', error);
    return { data: null, error };
  }
}

// Função para atualizar uma mesa
export async function updateTable(id: string, tableData: Partial<Table>) {
  try {
    const updateData: any = {};
    
    if (tableData.name !== undefined) updateData.name = tableData.name;
    if (tableData.capacity !== undefined) updateData.capacity = tableData.capacity;
    if (tableData.location !== undefined) updateData.location = tableData.location;
    if (tableData.status !== undefined) updateData.status = tableData.status;
    
    const { data, error } = await postgres.from<Table>('tables')
      .update(updateData)
      .eq('id', id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao atualizar mesa:', error);
      return { data: null, error };
    }
    
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao atualizar mesa:', error);
    return { data: null, error };
  }
}

// Função para excluir uma mesa
export async function deleteTable(id: string) {
  try {
    // Verificar se a mesa está associada a pedidos
    const { count, error: countError } = await postgres.from('orders')
      .select()
      .eq('table_id', id)
      .count();
    
    if (countError) {
      console.error('[DataService] Erro ao verificar pedidos associados:', countError);
      return { success: false, error: countError };
    }
    
    if (count && count > 0) {
      return { 
        success: false, 
        error: new Error(`Não é possível excluir esta mesa pois está associada a ${count} pedido(s)`) 
      };
    }
    
    const { error } = await postgres.from<Table>('tables')
      .delete()
      .eq('id', id)
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao excluir mesa:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao excluir mesa:', error);
    return { success: false, error };
  }
}

// Função para buscar todos os pedidos
export async function fetchOrders() {
  try {
    const { data, error } = await postgres.from<Order>('orders')
      .select()
      .orderBy('order_time', 'DESC')
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao buscar pedidos:', error);
      return { data: null, error };
    }
    
    // Buscar itens de cada pedido
    if (data && data.length > 0) {
      const { data: itemsData, error: itemsError } = await postgres.from<OrderItem>('order_items')
        .select()
        .in('order_id', data.map(order => order.id))
        .execute();
      
      if (itemsError) {
        console.error('[DataService] Erro ao buscar itens dos pedidos:', itemsError);
        return { data, error: null }; // Retorna pedidos sem itens
      }
      
      // Agrupar itens por pedido
      const itemsByOrder: Record<string, OrderItem[]> = {};
      
      if (itemsData) {
        itemsData.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });
      }
      
      // Adicionar itens aos pedidos
      const ordersWithItems = data.map(order => ({
        ...order,
        items: itemsByOrder[order.id] || []
      }));
      
      return { data: ordersWithItems, error: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao buscar pedidos:', error);
    return { data: null, error };
  }
}

// Função para buscar um pedido por ID
export async function fetchOrderById(id: string) {
  try {
    const { data, error } = await postgres.from<Order>('orders')
      .select()
      .eq('id', id)
      .single()
      .execute();
    
    if (error) {
      console.error('[DataService] Erro ao buscar pedido por ID:', error);
      return { data: null, error };
    }
    
    // Buscar itens do pedido
    const { data: itemsData, error: itemsError } = await postgres.from<OrderItem>('order_items')
      .select()
      .eq('order_id', id)
      .execute();
    
    if (itemsError) {
      console.error('[DataService] Erro ao buscar itens do pedido:', itemsError);
      return { data, error: null }; // Retorna pedido sem itens
    }
    
    // Adicionar itens ao pedido
    const orderWithItems = {
      ...data,
      items: itemsData || []
    };
    
    return { data: orderWithItems, error: null };
  } catch (error) {
    console.error('[DataService] Exceção ao buscar pedido por ID:', error);
    return { data: null, error };
  }
}

// Função para criar um pedido manual
export async function createManualOrder(orderData: ManualOrderData) {
  // Usar transação para garantir consistência
  return await postgres.transaction(async (client) => {
    try {
      const orderId = uuidv4();
      const now = new Date().toISOString();
      
      // Dados do pedido
      const orderInsertData = {
        id: orderId,
        customer_name: orderData.customerName,
        customer_id: orderData.customerId || null,
        order_time: now,
        status: OrderStatus.RECEBIDO,
        total_amount: orderData.totalAmount,
        payment_status: 'pending',
        order_type: orderData.orderType,
        table_id: orderData.tableId || null,
        payment_method: null,
        amount_paid: null,
        notes: orderData.notes || null,
        auto_progress: true,
        current_progress_percent: 0
      };
      
      // Inserir pedido
      const { data: createdOrderData, error: orderInsertError } = await client.query(
        `INSERT INTO orders (
          id, customer_name, customer_id, order_time, status, total_amount, 
          payment_status, order_type, table_id, payment_method, amount_paid, 
          notes, auto_progress, current_progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *`,
        [
          orderInsertData.id,
          orderInsertData.customer_name,
          orderInsertData.customer_id,
          orderInsertData.order_time,
          orderInsertData.status,
          orderInsertData.total_amount,
          orderInsertData.payment_status,
          orderInsertData.order_type,
          orderInsertData.table_id,
          orderInsertData.payment_method,
          orderInsertData.amount_paid,
          orderInsertData.notes,
          orderInsertData.auto_progress,
          orderInsertData.current_progress_percent
        ]
      );
      
      if (orderInsertError || !createdOrderData || createdOrderData.length === 0) {
        throw new Error(`Erro ao criar pedido: ${orderInsertError?.message || 'Erro desconhecido'}`);
      }
      
      // Inserir itens do pedido
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const itemId = uuidv4();
          
          // Inserir item
          const { error: itemInsertError } = await client.query(
            `INSERT INTO order_items (
              id, order_id, menu_item_id, quantity, name, price,
              selected_size_id, selected_crust_id, is_half_and_half,
              first_half_flavor, second_half_flavor, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )`,
            [
              itemId,
              orderId,
              item.menuItemId,
              item.quantity,
              item.name,
              item.price,
              item.selectedSizeId || null,
              item.selectedCrustId || null,
              item.isHalfAndHalf || false,
              item.firstHalfFlavor || null,
              item.secondHalfFlavor || null,
              now
            ]
          );
          
          if (itemInsertError) {
            throw new Error(`Erro ao inserir item do pedido: ${itemInsertError.message}`);
          }
        }
      }
      
      // Atualizar status da mesa se necessário
      if (orderData.tableId) {
        const { error: tableUpdateError } = await client.query(
          `UPDATE tables SET status = 'occupied' WHERE id = $1`,
          [orderData.tableId]
        );
        
        if (tableUpdateError) {
          console.error('[DataService] Erro ao atualizar status da mesa:', tableUpdateError);
          // Não interromper a transação por causa disso
        }
      }
      
      // Buscar o pedido completo com itens
      return await fetchOrderById(orderId);
    } catch (error) {
      console.error('[DataService] Erro ao criar pedido manual:', error);
      throw error;
    }
  });
}

// Função para atualizar o status de um pedido
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return await postgres.transaction(async (client) => {
    try {
      // Buscar pedido atual
      const { data: orderData, error: orderError } = await client.query(
        `SELECT * FROM orders WHERE id = $1`,
        [orderId]
      );
      
      if (orderError || !orderData || orderData.length === 0) {
        throw new Error(`Pedido não encontrado: ${orderError?.message || 'Erro desconhecido'}`);
      }
      
      const order = orderData[0];
      
      // Atualizar status
      const now = new Date().toISOString();
      
      const { error: updateError } = await client.query(
        `UPDATE orders SET 
          status = $1, 
          updated_at = $2
        WHERE id = $3`,
        [status, now, orderId]
      );
      
      if (updateError) {
        throw new Error(`Erro ao atualizar status do pedido: ${updateError.message}`);
      }
      
      // Se o pedido foi finalizado e está associado a uma mesa, liberar a mesa
      if (status === OrderStatus.FINALIZADO && order.table_id) {
        await client.query(
          `UPDATE tables SET status = 'available' WHERE id = $1`,
          [order.table_id]
        );
      }
      
      // Buscar o pedido atualizado
      return await fetchOrderById(orderId);
    } catch (error) {
      console.error('[DataService] Erro ao atualizar status do pedido:', error);
      throw error;
    }
  });
}

// Função para registrar pagamento de um pedido
export async function registerOrderPayment(orderId: string, paymentMethod: string, amountPaid: number) {
  return await postgres.transaction(async (client) => {
    try {
      // Atualizar pedido
      const now = new Date().toISOString();
      
      const { error: updateError } = await client.query(
        `UPDATE orders SET 
          payment_method = $1, 
          amount_paid = $2, 
          payment_status = 'paid', 
          updated_at = $3
        WHERE id = $4`,
        [paymentMethod, amountPaid, now, orderId]
      );
      
      if (updateError) {
        throw new Error(`Erro ao registrar pagamento: ${updateError.message}`);
      }
      
      // Buscar o pedido atualizado
      return await fetchOrderById(orderId);
    } catch (error) {
      console.error('[DataService] Erro ao registrar pagamento:', error);
      throw error;
    }
  });
}

// Função para criar um pedido de mesa
export async function createTableOrder(
  tableId: string,
  items: Array<{
    menuItemId: string;
    quantity: number;
    name: string;
    price: number;
    selectedSizeId?: string;
    selectedCrustId?: string;
    isHalfAndHalf?: boolean;
    firstHalfFlavor?: any;
    secondHalfFlavor?: any;
  }>,
  customerDetails?: CustomerDetails,
  notes?: string
) {
  // Usar transação para garantir consistência
  return await postgres.transaction(async (client) => {
    try {
      const orderId = uuidv4();
      const now = new Date().toISOString();
      
      // Calcular valor total
      const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      // Dados do pedido
      const orderInsertData = {
        id: orderId,
        customer_name: customerDetails?.name || 'Mesa',
        customer_id: customerDetails?.id || null,
        order_time: now,
        status: OrderStatus.RECEBIDO,
        total_amount: totalAmount,
        payment_status: 'pending',
        order_type: 'mesa',
        table_id: tableId,
        payment_method: null,
        amount_paid: null,
        notes: notes || null,
        auto_progress: true,
        current_progress_percent: 0
      };
      
      // Inserir pedido
      const { error: orderInsertError } = await client.query(
        `INSERT INTO orders (
          id, customer_name, customer_id, order_time, status, total_amount, 
          payment_status, order_type, table_id, payment_method, amount_paid, 
          notes, auto_progress, current_progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )`,
        [
          orderInsertData.id,
          orderInsertData.customer_name,
          orderInsertData.customer_id,
          orderInsertData.order_time,
          orderInsertData.status,
          orderInsertData.total_amount,
          orderInsertData.payment_status,
          orderInsertData.order_type,
          orderInsertData.table_id,
          orderInsertData.payment_method,
          orderInsertData.amount_paid,
          orderInsertData.notes,
          orderInsertData.auto_progress,
          orderInsertData.current_progress_percent
        ]
      );
      
      if (orderInsertError) {
        throw new Error(`Erro ao criar pedido: ${orderInsertError.message}`);
      }
      
      // Inserir itens do pedido
      for (const item of items) {
        const itemId = uuidv4();
        
        // Inserir item
        const { error: itemInsertError } = await client.query(
          `INSERT INTO order_items (
            id, order_id, menu_item_id, quantity, name, price,
            selected_size_id, selected_crust_id, is_half_and_half,
            first_half_flavor, second_half_flavor, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )`,
          [
            itemId,
            orderId,
            item.menuItemId,
            item.quantity,
            item.name,
            item.price,
            item.selectedSizeId || null,
            item.selectedCrustId || null,
            item.isHalfAndHalf || false,
            item.firstHalfFlavor || null,
            item.secondHalfFlavor || null,
            now
          ]
        );
        
        if (itemInsertError) {
          throw new Error(`Erro ao inserir item do pedido: ${itemInsertError.message}`);
        }
      }
      
      // Atualizar status da mesa
      await client.query(
        `UPDATE tables SET status = 'occupied' WHERE id = $1`,
        [tableId]
      );
      
      // Buscar o pedido completo com itens
      return await fetchOrderById(orderId);
    } catch (error) {
      console.error('[DataService] Erro ao criar pedido de mesa:', error);
      throw error;
    }
  });
}

// Exportar funções
export const dataService = {
  fetchCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  fetchMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchTables,
  addTable,
  updateTable,
  deleteTable,
  fetchOrders,
  fetchOrderById,
  createManualOrder,
  updateOrderStatus,
  registerOrderPayment,
  createTableOrder
};

export default dataService;
