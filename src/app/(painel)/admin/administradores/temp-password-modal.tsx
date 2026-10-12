"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export function TempPasswordModal({
  open,
  email,
  password,
  onClose,
}: {
  open: boolean;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Senha temporária gerada"
      description="Copie e envie para a pessoa com segurança. Ela deverá trocar a senha no primeiro acesso."
      footer={<Button type="button" onClick={onClose}>Concluir</Button>}
    >
      <div className="space-y-4">
        <Alert tone="amber">
          Esta senha aparece <strong>uma única vez</strong>. Ela não fica salva em nenhum lugar do sistema.
        </Alert>
        <div>
          <p className="text-xs font-medium text-muted">Acesso</p>
          <p className="text-sm text-ink">{email}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Senha temporária</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 select-all rounded-[var(--radius-sm)] border border-line bg-paper px-3.5 py-2.5 font-mono text-sm text-ink">{password}</code>
            <Button type="button" variant="outline" size="sm" onClick={copy}>{copied ? "Copiado" : "Copiar"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}