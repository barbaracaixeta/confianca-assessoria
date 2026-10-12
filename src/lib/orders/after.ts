/**
 * Camada fina sobre o `after` do Next. Em runtime re-exporta a implementação
 * real; no ambiente de teste permite o `vi.mock` interceptar a agenda de
 * efeitos pós-resposta (sem depender do empacotamento interno do `next/server`).
 */
export { after } from "next/server";