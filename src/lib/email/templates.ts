import { formatMoney } from "@/lib/utils";

/**
 * Modelos de e-mail transacional. HTML simples, com estilos inline para
 * compatibilidade com clientes de e-mail.
 */
export type EmailTemplate =
  | { name: "signup"; data: { fullName: string } }
  | { name: "order_created"; data: { orderNumber: string; totalCents: number; orderUrl: string } }
  | { name: "payment_pending"; data: { orderNumber: string; totalCents: number; orderUrl: string } }
  | { name: "payment_confirmed"; data: { orderNumber: string; orderUrl: string } }
  | { name: "product_available"; data: { orderNumber: string; orderUrl: string; productsUrl?: string } }
  | { name: "order_received"; data: { orderNumber: string; orderUrl: string } }
  | { name: "status_changed"; data: { orderNumber: string; statusLabel: string; orderUrl: string } }
  | { name: "file_received"; data: { orderNumber: string; fileName: string; orderUrl: string } }
  | { name: "order_delivered"; data: { orderNumber: string; orderUrl: string } };

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F8FAF8;font-family:Arial,Helvetica,sans-serif;color:#1F2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:3px solid #0B5139">
<tr><td style="padding:32px 32px 8px;font-family:Georgia,serif;font-size:20px;color:#0B5139">Confiança</td></tr>
<tr><td style="padding:8px 32px 0;font-family:Georgia,serif;font-size:24px;line-height:1.3">${title}</td></tr>
<tr><td style="padding:16px 32px 8px;font-size:15px;line-height:1.6;color:#3E4C59">${body}</td></tr>
${cta ? `<tr><td style="padding:16px 32px 32px"><a href="${cta.href}" style="display:inline-block;background:#0B5139;color:#F8FAF8;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:15px">${cta.label}</a></td></tr>` : `<tr><td style="padding:16px"></td></tr>`}
</table>
<p style="font-size:12px;color:#5B6875;margin-top:16px">Confiança Assessoria Acadêmica</p>
</td></tr></table></body></html>`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail(t: EmailTemplate): { subject: string; html: string } {
  switch (t.name) {
    case "signup":
      return {
        subject: "Sua conta na Confiança está pronta",
        html: layout(`Olá, ${esc(t.data.fullName)}`, "Sua conta foi criada. Por ela você acompanha pedidos, envia arquivos e conversa com a equipe."),
      };
    case "order_created":
      return {
        subject: `Pedido ${t.data.orderNumber} recebido`,
        html: layout(`Pedido ${t.data.orderNumber}`, `Recebemos seu pedido no valor de <strong>${formatMoney(t.data.totalCents)}</strong>. Assim que o pagamento for confirmado, avisaremos por aqui.`, { label: "Ver pedido", href: t.data.orderUrl }),
      };
    case "payment_pending":
      return {
        subject: `Pagamento pendente: pedido ${t.data.orderNumber}`,
        html: layout("Seu pagamento ainda não foi identificado", `O pedido ${t.data.orderNumber} (${formatMoney(t.data.totalCents)}) aguarda pagamento. O código Pix continua disponível na página do pedido.`, { label: "Pagar agora", href: t.data.orderUrl }),
      };
    case "payment_confirmed":
      return {
        subject: `Pagamento confirmado: pedido ${t.data.orderNumber}`,
        html: layout("Pagamento confirmado", `O pagamento do pedido ${t.data.orderNumber} foi confirmado. Acompanhe o andamento pela página do pedido.`, { label: "Ver pedido", href: t.data.orderUrl }),
      };
    case "product_available":
      return {
        subject: `Seus produtos já estão liberados: pedido ${t.data.orderNumber}`,
        html: layout("Seus produtos foram liberados", `O pagamento do pedido ${t.data.orderNumber} foi confirmado e os produtos já estão disponíveis para download na sua conta.`, { label: "Abrir Meus produtos", href: t.data.productsUrl ?? t.data.orderUrl }),
      };
    case "order_received":
      return {
        subject: `Pedido ${t.data.orderNumber} em análise`,
        html: layout("Recebemos seu material", `A equipe já está analisando o pedido ${t.data.orderNumber}.`, { label: "Acompanhar", href: t.data.orderUrl }),
      };
    case "status_changed":
      return {
        subject: `Pedido ${t.data.orderNumber}: ${t.data.statusLabel}`,
        html: layout("Seu pedido avançou", `O pedido ${t.data.orderNumber} agora está em: <strong>${esc(t.data.statusLabel)}</strong>.`, { label: "Ver detalhes", href: t.data.orderUrl }),
      };
    case "file_received":
      return {
        subject: `Arquivo recebido: pedido ${t.data.orderNumber}`,
        html: layout("Arquivo recebido", `Recebemos o arquivo <strong>${esc(t.data.fileName)}</strong> no pedido ${t.data.orderNumber}.`, { label: "Ver pedido", href: t.data.orderUrl }),
      };
    case "order_delivered":
      return {
        subject: `Pedido ${t.data.orderNumber} entregue`,
        html: layout("Seu pedido foi entregue", `Os arquivos do pedido ${t.data.orderNumber} estão disponíveis para download na sua conta.`, { label: "Baixar arquivos", href: t.data.orderUrl }),
      };
  }
}
