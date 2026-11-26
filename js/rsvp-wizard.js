// Wizard de confirmação de presença (usa js/supabase-config.js).
// Os dados ficam só no navegador até o clique final em "Confirmar presença",
// quando tudo é gravado de uma vez pela função confirmar_presenca do Supabase.

const PASSOS = ["Você", "Acompanhantes", "Presente", "Confirmação"];

const wiz = {
    passo: 1,
    titular: { nome: "", rg: "" },
    consentimento: false,
    acompanhantes: [],
    presente: null,
    aba: "amazon",
    presentes: [],
    carregandoPresentes: false,
    enviando: false,
    erro: ""
};

function normalizarRg(rg) {
    return String(rg || "").replace(/[^0-9a-z]/gi, "").toUpperCase();
}

function validarPessoa(nome, rg) {
    if (nome.trim().length < 2) return "Informe o nome completo.";
    const n = normalizarRg(rg).length;
    if (n < 5 || n > 14) return "Informe um RG válido.";
    return "";
}

function rgJaUsado(rg, ignorarIndice = -1) {
    const alvo = normalizarRg(rg);
    const todos = [wiz.titular, ...wiz.acompanhantes];
    return todos.some((p, i) => i !== ignorarIndice && normalizarRg(p.rg) === alvo);
}

function nomePessoa(indice) {
    return indice === 0 ? "você" : (wiz.acompanhantes[indice - 1]?.nome || "um acompanhante");
}

// ---------- Renderização ----------

function renderWizard() {
    const el = document.getElementById("rsvp-wizard");
    if (!el) return;

    if (wiz.passo === 5) {
        el.innerHTML = renderSucesso();
        return;
    }

    const progresso = PASSOS.map((nome, i) => {
        const n = i + 1;
        const cls = n < wiz.passo ? "feito" : n === wiz.passo ? "atual" : "";
        return `<li class="${cls}"><span class="wiz-bolinha">${n < wiz.passo ? "✓" : n}</span><span class="wiz-rotulo">${nome}</span></li>`;
    }).join("");

    const corpo = { 1: renderPasso1, 2: renderPasso2, 3: renderPasso3, 4: renderPasso4 }[wiz.passo]();

    el.innerHTML = `
        <ol class="wiz-progresso">${progresso}</ol>
        <div class="wiz-corpo">${corpo}</div>
        <p class="wiz-erro" role="alert">${escapeHtml(wiz.erro)}</p>
    `;
}

function renderPasso1() {
    return `
        <h3 class="wiz-titulo">Seus dados</h3>
        <p class="wiz-ajuda">Precisamos do nome e RG de cada convidado para a lista de acesso do evento.</p>
        <label class="rsvp-label" for="wiz-nome">Nome completo</label>
        <input id="wiz-nome" class="rsvp-input" type="text" maxlength="100" autocomplete="name" value="${escapeHtml(wiz.titular.nome)}">
        <label class="rsvp-label" for="wiz-rg">RG</label>
        <input id="wiz-rg" class="rsvp-input" type="text" maxlength="20" inputmode="text" value="${escapeHtml(wiz.titular.rg)}" placeholder="Ex.: 12.345.678-9">
        <label class="wiz-consentimento">
            <input type="checkbox" id="wiz-consent" ${wiz.consentimento ? "checked" : ""}>
            <span>Autorizo o uso do meu nome e RG, e dos meus acompanhantes, apenas para a lista de acesso do casamento.</span>
        </label>
        <div class="wiz-botoes">
            <button class="btn-rsvp" onclick="wizAvancarDe1()">Próximo →</button>
        </div>
    `;
}

function renderPasso2() {
    const lista = wiz.acompanhantes.length
        ? `<ul class="wiz-lista-pessoas">${wiz.acompanhantes.map((p, i) => `
            <li>
                <div><strong>${escapeHtml(p.nome)}</strong><span>RG ${escapeHtml(p.rg)}</span></div>
                <button class="wiz-remover" onclick="wizRemoverAcompanhante(${i})" aria-label="Remover ${escapeHtml(p.nome)}">Remover</button>
            </li>`).join("")}</ul>`
        : `<p class="wiz-vazio">Nenhum acompanhante adicionado. Se vier sozinho(a), é só seguir.</p>`;

    return `
        <h3 class="wiz-titulo">Acompanhantes</h3>
        <p class="wiz-ajuda">Adicione cada pessoa que virá com você.</p>
        ${lista}
        <div class="wiz-add">
            <input id="wiz-ac-nome" class="rsvp-input" type="text" maxlength="100" placeholder="Nome completo do acompanhante">
            <input id="wiz-ac-rg" class="rsvp-input" type="text" maxlength="20" placeholder="RG do acompanhante">
            <button class="wiz-btn-secundario" onclick="wizAdicionarAcompanhante()">+ Adicionar acompanhante</button>
        </div>
        <div class="wiz-botoes">
            <button class="wiz-btn-secundario" onclick="wizIrPara(1)">← Voltar</button>
            <button class="btn-rsvp" onclick="wizAvancarDe2()">Próximo →</button>
        </div>
    `;
}

function renderPasso3() {
    let grade;
    if (wiz.carregandoPresentes) {
        grade = `<p class="wiz-vazio">Carregando presentes...</p>`;
    } else {
        const itens = wiz.presentes.filter(p => p.tipo === wiz.aba);
        grade = itens.length
            ? `<div class="wiz-presentes">${itens.map(p => {
                const sel = wiz.presente?.id === p.id ? " selecionado" : "";
                const img = p.imagem
                    ? `<img src="${escapeHtml(p.imagem)}" alt="" loading="lazy">`
                    : `<span>${escapeHtml(p.emoji || "🎁")}</span>`;
                return `<button class="wiz-presente${sel}" onclick="wizSelecionarPresente(${p.id})">
                    <div class="wiz-presente-img">${img}</div>
                    <span class="wiz-presente-nome">${escapeHtml(p.nome)}</span>
                    <span class="wiz-presente-preco">${formatarPreco(p.preco)}</span>
                </button>`;
            }).join("")}</div>`
            : `<p class="wiz-vazio">Todos os presentes desta lista já foram escolhidos 💝</p>`;
    }

    return `
        <h3 class="wiz-titulo">Quer escolher um presente?</h3>
        <p class="wiz-ajuda">É opcional! Escolha um item da Amazon ou um presente via PIX. Ele fica reservado no seu nome quando você confirmar a presença.</p>
        <div class="wiz-abas" role="tablist">
            <button role="tab" class="${wiz.aba === "amazon" ? "ativa" : ""}" onclick="wizTrocarAba('amazon')">Amazon</button>
            <button role="tab" class="${wiz.aba === "pix" ? "ativa" : ""}" onclick="wizTrocarAba('pix')">PIX</button>
        </div>
        ${grade}
        ${wiz.presente ? renderDetalhePresente(wiz.presente) : ""}
        <div class="wiz-botoes">
            <button class="wiz-btn-secundario" onclick="wizIrPara(2)">← Voltar</button>
            <button class="wiz-btn-secundario" onclick="wizPularPresente()">Pular</button>
            <button class="btn-rsvp" onclick="wizIrPara(4)" ${wiz.presente ? "" : "disabled"}>Próximo →</button>
        </div>
    `;
}

function renderDetalhePresente(p) {
    const acao = p.tipo === "amazon"
        ? `<a class="btn-amazon" href="${escapeHtml(p.link_amazon)}" target="_blank" rel="noopener noreferrer">Comprar na Amazon ↗</a>
           <p class="wiz-ajuda">Você pode comprar agora ou depois. Dica: comprando pela nossa lista na Amazon, a entrega já vai para o nosso endereço.</p>`
        : `<p class="wiz-ajuda">Transfira <strong>${formatarPreco(p.preco)}</strong> para a chave PIX da noiva:</p>
           <div class="pix-key">${CHAVE_PIX_NOIVA}</div>
           <button class="wiz-btn-secundario" onclick="wizCopiarPix(this)">Copiar chave PIX</button>`;
    return `
        <div class="wiz-detalhe">
            <p><strong>Presente escolhido:</strong> ${escapeHtml(p.nome)}</p>
            ${acao}
            <button class="wiz-link" onclick="wizLimparPresente()">Remover escolha</button>
        </div>
    `;
}

function renderPasso4() {
    const pessoas = [wiz.titular, ...wiz.acompanhantes].map((p, i) => `
        <li><div><strong>${escapeHtml(p.nome)}</strong><span>RG ${escapeHtml(p.rg)}${i === 0 ? " · titular" : ""}</span></div></li>
    `).join("");

    const presente = wiz.presente
        ? `${escapeHtml(wiz.presente.nome)} <span class="wiz-tag">${wiz.presente.tipo === "pix" ? "PIX" : "Amazon"}</span>`
        : "Nenhum (tudo bem! Sua presença é o nosso maior presente 🤍)";

    return `
        <h3 class="wiz-titulo">Confira e confirme</h3>
        <p class="wiz-ajuda">${1 + wiz.acompanhantes.length} pessoa(s) confirmada(s):</p>
        <ul class="wiz-lista-pessoas">${pessoas}</ul>
        <p class="wiz-resumo-presente"><strong>Presente:</strong> ${presente}</p>
        <div class="wiz-botoes">
            <button class="wiz-btn-secundario" onclick="wizIrPara(3)" ${wiz.enviando ? "disabled" : ""}>← Voltar</button>
            <button class="btn-rsvp" onclick="wizConfirmar()" ${wiz.enviando ? "disabled" : ""}>${wiz.enviando ? "Enviando..." : "Confirmar presença ✨"}</button>
        </div>
    `;
}

function renderSucesso() {
    const lembretePix = wiz.presente?.tipo === "pix"
        ? `<p class="wiz-ajuda">Lembrete: o PIX de <strong>${formatarPreco(wiz.presente.preco)}</strong> vai para a chave</p><div class="pix-key">${CHAVE_PIX_NOIVA}</div>`
        : wiz.presente?.tipo === "amazon"
            ? `<p class="wiz-ajuda">Não esqueça de comprar <strong>${escapeHtml(wiz.presente.nome)}</strong> na <a href="${escapeHtml(wiz.presente.link_amazon)}" target="_blank" rel="noopener noreferrer">Amazon</a>.</p>`
            : "";
    return `
        <div class="wiz-sucesso">
            <div style="font-size: 2.8rem;">🎉</div>
            <h3 class="wiz-titulo">Presença confirmada!</h3>
            <p class="wiz-ajuda">Obrigado, ${escapeHtml(wiz.titular.nome.split(" ")[0])}! Confirmamos ${1 + wiz.acompanhantes.length} pessoa(s). Mal podemos esperar para celebrar com vocês.</p>
            ${lembretePix}
        </div>
    `;
}

// ---------- Ações ----------

function lerPasso1() {
    const nome = document.getElementById("wiz-nome");
    if (!nome) return;
    wiz.titular.nome = nome.value.trim();
    wiz.titular.rg = document.getElementById("wiz-rg").value.trim();
    wiz.consentimento = document.getElementById("wiz-consent").checked;
}

function wizIrPara(passo) {
    if (wiz.passo === 1) lerPasso1();
    wiz.erro = "";
    wiz.passo = passo;
    if (passo === 3 && !wiz.presentes.length) carregarPresentesWizard();
    renderWizard();
    document.getElementById("presenca")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wizAvancarDe1() {
    lerPasso1();
    const erro = validarPessoa(wiz.titular.nome, wiz.titular.rg);
    if (erro) return mostrarErro(erro);
    if (!wiz.consentimento) return mostrarErro("Para confirmar, precisamos da sua autorização para usar os dados.");
    if (rgJaUsado(wiz.titular.rg, 0)) return mostrarErro("Esse RG já está na lista de acompanhantes.");
    wizIrPara(2);
}

function wizAdicionarAcompanhante() {
    const nomeEl = document.getElementById("wiz-ac-nome");
    const rgEl = document.getElementById("wiz-ac-rg");
    const nome = nomeEl.value.trim();
    const rg = rgEl.value.trim();

    const erro = validarPessoa(nome, rg);
    if (erro) { mostrarErro(erro); return false; }
    if (rgJaUsado(rg)) { mostrarErro("Esse RG já foi adicionado."); return false; }
    if (wiz.acompanhantes.length >= 49) { mostrarErro("Limite de acompanhantes atingido."); return false; }

    wiz.acompanhantes.push({ nome, rg });
    wiz.erro = "";
    renderWizard();
    document.getElementById("wiz-ac-nome")?.focus();
    return true;
}

function wizRemoverAcompanhante(i) {
    wiz.acompanhantes.splice(i, 1);
    renderWizard();
}

function wizAvancarDe2() {
    const nome = document.getElementById("wiz-ac-nome").value.trim();
    const rg = document.getElementById("wiz-ac-rg").value.trim();
    // Se a pessoa preencheu e esqueceu de clicar em "Adicionar", adiciona por ela.
    if (nome || rg) {
        if (!wizAdicionarAcompanhante()) return;
    }
    wizIrPara(3);
}

async function carregarPresentesWizard() {
    wiz.carregandoPresentes = true;
    renderWizard();
    try {
        wiz.presentes = await supabaseFetch(
            "presentes?select=id,nome,preco,link_amazon,imagem,emoji,tipo&reservado=is.false&order=tipo.asc,codigo_pix.asc.nullsfirst,id.asc"
        );
        if (wiz.presente && !wiz.presentes.some(p => p.id === wiz.presente.id)) wiz.presente = null;
    } catch (e) {
        console.error("Erro ao carregar presentes:", e);
        wiz.erro = "Não foi possível carregar os presentes. Você pode pular esta etapa ou tentar novamente.";
    }
    wiz.carregandoPresentes = false;
    renderWizard();
}

function wizTrocarAba(aba) {
    wiz.aba = aba;
    renderWizard();
}

function wizSelecionarPresente(id) {
    wiz.presente = wiz.presentes.find(p => p.id === id) || null;
    wiz.erro = "";
    renderWizard();
    document.querySelector(".wiz-detalhe")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function wizLimparPresente() {
    wiz.presente = null;
    renderWizard();
}

function wizPularPresente() {
    wiz.presente = null;
    wizIrPara(4);
}

function wizCopiarPix(btn) {
    navigator.clipboard?.writeText(CHAVE_PIX_NOIVA).then(() => {
        btn.textContent = "Chave copiada ✓";
    }).catch(() => {});
}

async function wizConfirmar() {
    if (wiz.enviando) return;
    wiz.enviando = true;
    wiz.erro = "";
    renderWizard();

    let res;
    try {
        res = await supabaseFetch("rpc/confirmar_presenca", {
            method: "POST",
            body: JSON.stringify({
                p_titular: wiz.titular,
                p_acompanhantes: wiz.acompanhantes,
                p_presente_id: wiz.presente?.id ?? null,
                p_consentimento: wiz.consentimento
            })
        });
    } catch (e) {
        console.error("Erro ao confirmar presença:", e);
        res = { ok: false, erro: "rede" };
    }
    wiz.enviando = false;

    if (res.ok) {
        wiz.passo = 5;
        renderWizard();
        if (typeof carregarPresentesAmazon === "function") carregarPresentesAmazon();
        if (typeof marcarPixReservados === "function") marcarPixReservados();
        return;
    }

    const quem = res.pessoa != null ? nomePessoa(res.pessoa) : "";
    switch (res.erro) {
        case "presente_indisponivel":
            wiz.presente = null;
            wiz.passo = 3;
            await carregarPresentesWizard();
            return mostrarErro("Esse presente acabou de ser escolhido por outra pessoa 😅 Escolha outro ou pule esta etapa.");
        case "rg_ja_confirmado":
            wiz.passo = res.pessoa === 0 ? 1 : 2;
            return mostrarErro(quem
                ? `O RG de ${quem} já está com presença confirmada. Se precisar alterar algo, fale com os noivos.`
                : "Um dos RGs informados já está com presença confirmada.");
        case "rg_repetido":
            wiz.passo = 2;
            return mostrarErro(`O RG de ${quem} está repetido na lista.`);
        case "nome_invalido":
        case "rg_invalido":
            wiz.passo = res.pessoa === 0 ? 1 : 2;
            return mostrarErro(`Confira o nome e o RG de ${quem}.`);
        case "consentimento":
            wiz.passo = 1;
            return mostrarErro("Para confirmar, precisamos da sua autorização para usar os dados.");
        default:
            return mostrarErro("Não foi possível confirmar agora. Verifique sua conexão e tente novamente.");
    }
}

function mostrarErro(msg) {
    wiz.erro = msg;
    renderWizard();
    document.querySelector("#rsvp-wizard .wiz-erro")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("DOMContentLoaded", () => {
    renderWizard();
    document.getElementById("rsvp-wizard")?.addEventListener("keydown", e => {
        if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
        if (wiz.passo === 1) wizAvancarDe1();
        else if (wiz.passo === 2) wizAdicionarAcompanhante();
    });
});
