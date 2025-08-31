import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Check, 
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Clock
} from 'lucide-react';

export default function ReceiptGenerator({ order, onClose }) {
  const [generating, setGenerating] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const generatePDFReceipt = async () => {
    setGenerating(true);
    
    try {
      // Criar conteúdo HTML do comprovante
      const receiptHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprovante de Pagamento - ${order.orderNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: #f9f9f9;
            }
            
            .receipt {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #f97316, #dc2626);
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .header h1 {
              font-size: 2.5em;
              margin-bottom: 10px;
              font-weight: bold;
            }
            
            .header p {
              font-size: 1.2em;
              opacity: 0.9;
            }
            
            .content {
              padding: 30px;
            }
            
            .section {
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #f97316;
            }
            
            .section h2 {
              color: #f97316;
              margin-bottom: 15px;
              font-size: 1.3em;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
            }
            
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .info-item:last-child {
              border-bottom: none;
            }
            
            .info-label {
              font-weight: 600;
              color: #6b7280;
            }
            
            .info-value {
              color: #111827;
              font-weight: 500;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            
            .items-table th,
            .items-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .items-table th {
              background: #f3f4f6;
              font-weight: 600;
              color: #374151;
            }
            
            .total-section {
              background: #f97316;
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-top: 20px;
            }
            
            .total-amount {
              font-size: 2em;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 0.9em;
              background: #10b981;
              color: white;
            }
            
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              margin-top: 30px;
            }
            
            .qr-section {
              text-align: center;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              margin: 20px 0;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .receipt {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>🍔 Burger House</h1>
              <p>Comprovante de Pagamento</p>
            </div>
            
            <div class="content">
              <!-- Informações do Pedido -->
              <div class="section">
                <h2>📋 Informações do Pedido</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Número do Pedido:</span>
                    <span class="info-value">${order.orderNumber}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Data do Pedido:</span>
                    <span class="info-value">${formatDate(order.createdAt)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Data do Pagamento:</span>
                    <span class="info-value">${formatDate(order.paidAt || order.createdAt)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="status-badge">✅ Pagamento Confirmado</span>
                  </div>
                </div>
              </div>
              
              <!-- Dados do Cliente -->
              <div class="section">
                <h2>👤 Dados do Cliente</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${order.customer.name}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">E-mail:</span>
                    <span class="info-value">${order.customer.email}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Telefone:</span>
                    <span class="info-value">${order.customer.phone}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Método de Pagamento:</span>
                    <span class="info-value">${order.paymentMethod === 'pix' ? '📱 PIX' : order.paymentMethod}</span>
                  </div>
                </div>
              </div>
              
              <!-- Endereço de Entrega -->
              <div class="section">
                <h2>📍 Endereço de Entrega</h2>
                <div class="info-item">
                  <span class="info-label">Endereço Completo:</span>
                  <span class="info-value">
                    ${order.customer.address.street}, ${order.customer.address.number}
                    ${order.customer.address.complement ? ', ' + order.customer.address.complement : ''}
                    <br>
                    ${order.customer.address.neighborhood} - ${order.customer.address.city}
                    <br>
                    CEP: ${order.customer.address.zipCode}
                  </span>
                </div>
              </div>
              
              <!-- Itens do Pedido -->
              <div class="section">
                <h2>🛒 Itens do Pedido</h2>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantidade</th>
                      <th>Valor Unitário</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.items.map(item => `
                      <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${formatPrice(item.price)}</td>
                        <td>${formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                
                <div class="total-section">
                  <div>Total do Pedido</div>
                  <div class="total-amount">${formatPrice(order.total)}</div>
                  <div>Pagamento via ${order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod}</div>
                </div>
              </div>
              
              <!-- Informações Adicionais -->
              <div class="section">
                <h2>ℹ️ Informações Adicionais</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Tempo de Entrega:</span>
                    <span class="info-value">30-45 minutos</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Taxa de Entrega:</span>
                    <span class="info-value">Grátis</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Observações:</span>
                    <span class="info-value">Pedido confirmado e em preparo</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Burger House</strong> - A melhor lanchonete da cidade!</p>
              <p>📞 (11) 99999-9999 | 📧 contato@burgerhouse.com</p>
              <p>Comprovante gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Criar e baixar o arquivo HTML
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprovante-${order.orderNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Também criar um arquivo de texto simples
      const textReceipt = `
COMPROVANTE DE PAGAMENTO
========================

🍔 BURGER HOUSE
Comprovante de Pagamento

INFORMAÇÕES DO PEDIDO
---------------------
Número do Pedido: ${order.orderNumber}
Data do Pedido: ${formatDate(order.createdAt)}
Data do Pagamento: ${formatDate(order.paidAt || order.createdAt)}
Status: ✅ Pagamento Confirmado

DADOS DO CLIENTE
----------------
Nome: ${order.customer.name}
E-mail: ${order.customer.email}
Telefone: ${order.customer.phone}
Método de Pagamento: ${order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod}

ENDEREÇO DE ENTREGA
-------------------
${order.customer.address.street}, ${order.customer.address.number}
${order.customer.address.complement ? order.customer.address.complement + '\n' : ''}${order.customer.address.neighborhood} - ${order.customer.address.city}
CEP: ${order.customer.address.zipCode}

ITENS DO PEDIDO
---------------
${order.items.map(item => 
  `${item.name} - ${item.quantity}x ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}`
).join('\n')}

TOTAL: ${formatPrice(order.total)}

INFORMAÇÕES ADICIONAIS
----------------------
Tempo de Entrega: 30-45 minutos
Taxa de Entrega: Grátis
Observações: Pedido confirmado e em preparo

---
Burger House - A melhor lanchonete da cidade!
📞 (11) 99999-9999 | 📧 contato@burgerhouse.com
Comprovante gerado em ${new Date().toLocaleString('pt-BR')}
      `;

      const textBlob = new Blob([textReceipt], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `comprovante-${order.orderNumber}.txt`;
      document.body.appendChild(textLink);
      textLink.click();
      document.body.removeChild(textLink);
      URL.revokeObjectURL(textUrl);

    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerar Comprovante</h2>
        <p className="text-gray-600">Pedido {order.orderNumber}</p>
      </div>

      {/* Preview do Comprovante */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Preview do Comprovante:</h3>
        
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>Data: {formatDate(order.paidAt || order.createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-orange-500" />
            <span>Cliente: {order.customer.name}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <span>Pagamento: {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span>Entrega: {order.customer.address.street}, {order.customer.address.number}</span>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center font-semibold">
              <span>Total:</span>
              <span className="text-orange-600">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
        
        <button
          onClick={generatePDFReceipt}
          disabled={generating}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Clock className="w-5 h-5 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Gerar Comprovante
            </>
          )}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        O comprovante será baixado em formato HTML e TXT
      </div>
    </motion.div>
  );
}

