// Configuração compartilhada do Supabase.
// A chave publicável é pública por design; a segurança está nas regras do banco (RLS + funções).
const SUPABASE_URL = "https://kbicepfblkizuudboknz.supabase.co";
const SUPABASE_KEY = "sb_publishable_pET_61Yx1MI2IMub91htyA_8kLGW2Sa";
const CHAVE_PIX_NOIVA = "44533749844";

async function supabaseFetch(path, options = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: SUPABASE_KEY,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    if (!resp.ok) {
        const erro = await resp.json().catch(() => ({}));
        throw new Error(erro.message || `Erro ${resp.status}`);
    }
    return resp.json();
}

function escapeHtml(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function formatarPreco(valor) {
    return valor != null
        ? "R$ " + Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
        : "Ver preço na Amazon";
}
