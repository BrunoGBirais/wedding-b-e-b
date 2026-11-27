// Wizard de confirmação de presença (usa js/supabase-config.js e products de js/script.js).

const PASSOS = ["Seus dados", "Presente", "Confirmação"];

const wiz = {
    passo: 1,
    titular: { nome: "", rg: "" },
    consentimento: false,
    acompanhantes: [],
    rascunhoAc: { nome: "", rg: "" },
    mostrarAcompanhantes: false,
    presente: null,
    presentePago: false,
    pixValorLivre: "",
    aba: "amazon",
    presentes: [],
    carregandoPresentes: false,
    enviando: false,
    erro: ""
};

function formatarPrecoWizard(valor) {
    if (valor === null || valor === undefined || valor === "") return "Valor livre";
    const num = Number(valor);
    if (!Number.isFinite(num)) return "Valor livre";
    return formatarPreco(num);
}

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

    if (wiz.passo === 4) {
        el.innerHTML = renderSucesso();
        return;
    }

    const progresso = PASSOS.map((nome, i) => {
        const n = i + 1;
        const cls = n < wiz.passo ? "feito" : n === wiz.passo ? "atual" : "";
        return `<li class="${cls}"><span class="wiz-bolinha">${n < wiz.passo ? "✓" : n}</span><span class="wiz-rotulo">${nome}</span></li>`;
    }).join("");

    const corpo = { 1: renderPasso1, 2: renderPasso2, 3: renderPasso3 }[wiz.passo]();

    el.innerHTML = `
        <ol class="wiz-progresso">${progresso}</ol>
        <div class="wiz-corpo">${corpo}</div>
        <p class="wiz-erro" role="alert">${escapeHtml(wiz.erro)}</p>
    `;
}

function renderPasso1() {
    const lista = wiz.acompanhantes.length
        ? `<ul class="wiz-lista-pessoas">${wiz.acompanhantes.map((p, i) => `
            <li>
                <div><strong>${escapeHtml(p.nome)}</strong><span>RG ${escapeHtml(p.rg)}</span></div>
                <button type="button" class="wiz-remover" onclick="wizRemoverAcompanhante(${i})" aria-label="Remover ${escapeHtml(p.nome)}">Remover</button>
            </li>`).join("")}</ul>`
        : "";

    const areaAcompanhante = (wiz.mostrarAcompanhantes || wiz.acompanhantes.length > 0)
        ? `
            <div class="wiz-add">
                <p class="wiz-ajuda" style="margin-bottom: 4px;"><strong>Acompanhante(s)</strong> — informe nome e RG:</p>
                ${lista}
                <input id="wiz-ac-nome" class="rsvp-input" type="text" maxlength="100" placeholder="Nome completo do acompanhante" value="${escapeHtml(wiz.rascunhoAc.nome)}">
                <input id="wiz-ac-rg" class="rsvp-input" type="text" maxlength="20" placeholder="RG do acompanhante" value="${escapeHtml(wiz.rascunhoAc.rg)}">
                <button type="button" class="wiz-btn-secundario" onclick="wizAdicionarAcompanhante()">+ Adicionar este acompanhante</button>
            </div>
        `
        : `
            <div style="margin-top: 14px;">
                <button type="button" class="wiz-btn-secundario" onclick="wizAbrirAcompanhante()">+ Levar acompanhante</button>
            </div>
        `;

    return `
        <h3 class="wiz-titulo">Seus dados</h3>
        <p class="wiz-ajuda">Precisamos do nome e RG de cada convidado para a lista de acesso do evento.</p>
        <label class="rsvp-label" for="wiz-nome">Seu nome completo</label>
        <input id="wiz-nome" class="rsvp-input" type="text" maxlength="100" autocomplete="name" value="${escapeHtml(wiz.titular.nome)}">
        <label class="rsvp-label" for="wiz-rg">Seu RG</label>
        <input id="wiz-rg" class="rsvp-input" type="text" maxlength="20" inputmode="text" value="${escapeHtml(wiz.titular.rg)}" placeholder="Ex.: 12.345.678-9">
        ${areaAcompanhante}
        <label class="wiz-consentimento">
            <input type="checkbox" id="wiz-consent" ${wiz.consentimento ? "checked" : ""}>
            <span>Autorizo o uso do meu nome e RG, e dos meus acompanhantes, apenas para a lista de acesso do casamento.</span>
        </label>
        <div class="wiz-botoes">
            <button type="button" class="btn-rsvp" onclick="wizAvancarDe1()">Próximo →</button>
        </div>
    `;
}

function renderPasso2() {
    let grade;
    if (wiz.carregandoPresentes) {
        grade = `<p class="wiz-vazio">Carregando presentes...</p>`;
    } else {
        const itens = wiz.presentes.filter(p => p.tipo === wiz.aba);
        grade = itens.length
            ? `<div class="wiz-presentes">${itens.map(p => {
                const sel = wiz.presente?.uid === p.uid ? " selecionado" : "";
                const img = p.imagem
                    ? `<img src="${escapeHtml(p.imagem)}" alt="" loading="lazy" onerror="this.outerHTML='<span>${escapeHtml(p.emoji || "🎁")}</span>'">`
                    : `<span>${escapeHtml(p.emoji || "🎁")}</span>`;
                return `<button type="button" class="wiz-presente${sel}" onclick="wizSelecionarPresente('${escapeHtml(p.uid)}')">
                    <div class="wiz-presente-img">${img}</div>
                    <span class="wiz-presente-nome">${escapeHtml(p.nome)}</span>
                    <span class="wiz-presente-preco">${formatarPrecoWizard(p.preco)}</span>
                </button>`;
            }).join("")}</div>`
            : `<p class="wiz-vazio">Todos os presentes desta lista já foram escolhidos 💝</p>`;
    }

    return `
        <h3 class="wiz-titulo">Quer escolher um presente?</h3>
        <p class="wiz-ajuda">É opcional! Você pode abrir o link da Amazon ou realizar o PIX agora mesmo.</p>
        <div class="wiz-abas" role="tablist">
            <button type="button" role="tab" class="${wiz.aba === "amazon" ? "ativa" : ""}" onclick="wizTrocarAba('amazon')">Amazon</button>
            <button type="button" role="tab" class="${wiz.aba === "pix" ? "ativa" : ""}" onclick="wizTrocarAba('pix')">PIX</button>
        </div>
        ${grade}
        ${wiz.presente ? renderDetalhePresente(wiz.presente) : ""}
        <div class="wiz-botoes">
            <button type="button" class="wiz-btn-secundario" onclick="wizIrPara(1)">← Voltar</button>
            <button type="button" class="wiz-btn-secundario" onclick="wizPularPresente()">Pular</button>
            <button type="button" class="btn-rsvp" onclick="wizIrPara(3)" ${wiz.presente ? "" : "disabled"}>Próximo →</button>
        </div>
    `;
}

function renderDetalhePresente(p) {
    if (p.tipo === "amazon") {
        return `
            <div class="wiz-detalhe">
                <p><strong>Presente selecionado:</strong> ${escapeHtml(p.nome)}</p>
                <a class="btn-amazon" href="${escapeHtml(p.link_amazon)}" target="_blank" rel="noopener noreferrer">Comprar na Amazon ↗</a>
                <p class="wiz-ajuda">Clique acima para abrir o item na Amazon e finalizar sua compra por lá.</p>
                <label class="wiz-consentimento" style="margin-top: 10px; background: #f4f7f4; padding: 10px 12px; border-radius: 6px; border: 1px solid #c9d6cb;">
                    <input type="checkbox" id="wiz-presente-pago" ${wiz.presentePago ? "checked" : ""} onchange="wizTogglePresentePago(this.checked)">
                    <span><strong>Já realizei a compra na Amazon</strong> deste presente ✓</span>
                </label>
                <button type="button" class="wiz-link" onclick="wizLimparPresente()">Remover seleção</button>
            </div>
        `;
    }

    const blocoValor = p.livre
        ? `<label class="rsvp-label" for="wiz-pix-valor-livre" style="margin-top: 8px;">Qual valor você deseja enviar? (opcional)</label>
           <input id="wiz-pix-valor-livre" class="rsvp-input" type="number" step="0.01" min="0" placeholder="Ex.: 150.00" value="${escapeHtml(wiz.pixValorLivre)}" oninput="wiz.pixValorLivre = this.value">`
        : `<p class="wiz-ajuda">Transfira <strong>${formatarPrecoWizard(p.preco)}</strong> para a chave PIX da noiva:</p>`;

    const rotuloPago = p.livre
        ? "<strong>Já realizei o PIX</strong> por livre e espontânea vontade ✓"
        : `<strong>Já realizei o PIX</strong> para este presente (${formatarPrecoWizard(p.preco)}) ✓`;

    return `
        <div class="wiz-detalhe">
            <p><strong>Presente selecionado:</strong> ${escapeHtml(p.nome)}</p>
            ${blocoValor}
            <div class="pix-key">${CHAVE_PIX_NOIVA}</div>
            <button type="button" class="wiz-btn-secundario" onclick="wizCopiarPix(this)">Copiar chave PIX</button>
            <label class="wiz-consentimento" style="margin-top: 10px; background: #f4f7f4; padding: 10px 12px; border-radius: 6px; border: 1px solid #c9d6cb;">
                <input type="checkbox" id="wiz-presente-pago" ${wiz.presentePago ? "checked" : ""} onchange="wizTogglePresentePago(this.checked)">
                <span>${rotuloPago}</span>
            </label>
            <button type="button" class="wiz-link" onclick="wizLimparPresente()">Remover seleção</button>
        </div>
    `;
}

function obterValorPixAtual() {
    if (!wiz.presente || wiz.presente.tipo !== "pix") return null;
    if (wiz.presente.livre) {
        const parsed = parseFloat(String(wiz.pixValorLivre || "").replace(",", "."));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return wiz.presente.preco ?? null;
}

function renderPasso3() {
    const pessoas = [wiz.titular, ...wiz.acompanhantes].map((p, i) => `
        <li><div><strong>${escapeHtml(p.nome)}</strong><span>RG ${escapeHtml(p.rg)}${i === 0 ? " · titular" : ""}</span></div></li>
    `).join("");

    let presente = "Nenhum (sua presença é o nosso maior presente 🤍)";
    if (wiz.presente?.tipo === "pix" && wiz.presentePago) {
        const val = obterValorPixAtual();
        const sufixoValor = val !== null ? ` (${formatarPrecoWizard(val)})` : " (valor livre)";
        presente = `${escapeHtml(wiz.presente.nome)}${sufixoValor} <span class="wiz-tag">PIX confirmado ✓</span>`;
    } else if (wiz.presente?.tipo === "pix" && !wiz.presentePago) {
        presente = `${escapeHtml(wiz.presente.nome)} <span class="wiz-tag" style="background:#888;">PIX pendente</span>`;
    } else if (wiz.presente?.tipo === "amazon" && wiz.presentePago) {
        presente = `${escapeHtml(wiz.presente.nome)} (${formatarPrecoWizard(wiz.presente.preco)}) <span class="wiz-tag">Compra Amazon confirmada ✓</span>`;
    } else if (wiz.presente?.tipo === "amazon" && !wiz.presentePago) {
        presente = `${escapeHtml(wiz.presente.nome)} <span class="wiz-tag" style="background:#888;">Compra Amazon pendente</span>`;
    }

    return `
        <h3 class="wiz-titulo">Confira e confirme</h3>
        <p class="wiz-ajuda">${1 + wiz.acompanhantes.length} pessoa(s) confirmada(s):</p>
        <ul class="wiz-lista-pessoas">${pessoas}</ul>
        <p class="wiz-resumo-presente"><strong>Presente:</strong> ${presente}</p>
        <div class="wiz-botoes">
            <button type="button" class="wiz-btn-secundario" onclick="wizIrPara(2)" ${wiz.enviando ? "disabled" : ""}>← Voltar</button>
            <button type="button" class="btn-rsvp" onclick="wizConfirmar()" ${wiz.enviando ? "disabled" : ""}>${wiz.enviando ? "Enviando..." : "Confirmar presença ✨"}</button>
        </div>
    `;
}

function renderSucesso() {
    let lembretePresente = "";
    if (wiz.presente?.tipo === "pix") {
        const val = obterValorPixAtual();
        const textoValor = val !== null ? ` — ${formatarPrecoWizard(val)}` : "";
        lembretePresente = wiz.presentePago
            ? `<p class="wiz-ajuda">Registramos o seu presente via PIX (<strong>${escapeHtml(wiz.presente.nome)}</strong>${textoValor}). Muito obrigado pelo carinho! 💚</p>`
            : `<p class="wiz-ajuda">Caso ainda queira enviar o PIX${textoValor}, a chave é:</p><div class="pix-key">${CHAVE_PIX_NOIVA}</div>`;
    } else if (wiz.presente?.tipo === "amazon") {
        lembretePresente = wiz.presentePago
            ? `<p class="wiz-ajuda">Registramos o seu presente da Amazon (<strong>${escapeHtml(wiz.presente.nome)}</strong>). Muito obrigado pelo carinho! 💚</p>`
            : `<p class="wiz-ajuda">Caso ainda não tenha finalizado a compra na Amazon, acesse o link: <a href="${escapeHtml(wiz.presente.link_amazon)}" target="_blank" rel="noopener noreferrer">${escapeHtml(wiz.presente.nome)}</a>.</p>`;
    }

    return `
        <div class="wiz-sucesso">
            <div style="font-size: 2.8rem;">🎉</div>
            <h3 class="wiz-titulo">Presença confirmada!</h3>
            <p class="wiz-ajuda">Obrigado, ${escapeHtml(wiz.titular.nome.split(" ")[0])}! Confirmamos ${1 + wiz.acompanhantes.length} pessoa(s). Mal podemos esperar para celebrar com vocês.</p>
            ${lembretePresente}
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

    const acNome = document.getElementById("wiz-ac-nome");
    const acRg = document.getElementById("wiz-ac-rg");
    if (acNome && acRg) {
        wiz.rascunhoAc.nome = acNome.value.trim();
        wiz.rascunhoAc.rg = acRg.value.trim();
    }
}

function wizAbrirAcompanhante() {
    lerPasso1();
    wiz.mostrarAcompanhantes = true;
    wiz.erro = "";
    renderWizard();
    document.getElementById("wiz-ac-nome")?.focus();
}

function wizAdicionarAcompanhante() {
    lerPasso1();
    const nome = wiz.rascunhoAc.nome;
    const rg = wiz.rascunhoAc.rg;

    const erro = validarPessoa(nome, rg);
    if (erro) { mostrarErro(erro); return false; }
    if (rgJaUsado(rg)) { mostrarErro("Esse RG já foi adicionado."); return false; }
    if (wiz.acompanhantes.length >= 49) { mostrarErro("Limite de acompanhantes atingido."); return false; }

    wiz.acompanhantes.push({ nome, rg });
    wiz.rascunhoAc = { nome: "", rg: "" };
    wiz.erro = "";
    renderWizard();
    document.getElementById("wiz-ac-nome")?.focus();
    return true;
}

function wizRemoverAcompanhante(i) {
    lerPasso1();
    wiz.acompanhantes.splice(i, 1);
    renderWizard();
}

function wizIrPara(passo) {
    if (wiz.passo === 1) lerPasso1();
    wiz.erro = "";
    wiz.passo = passo;
    if (passo === 2 && !wiz.presentes.length) carregarPresentesWizard();
    renderWizard();
    document.getElementById("presenca")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wizAvancarDe1() {
    lerPasso1();
    const erro = validarPessoa(wiz.titular.nome, wiz.titular.rg);
    if (erro) return mostrarErro(erro);
    if (rgJaUsado(wiz.titular.rg, 0)) return mostrarErro("Esse RG já está na lista de acompanhantes.");

    if (wiz.rascunhoAc.nome || wiz.rascunhoAc.rg) {
        if (!wizAdicionarAcompanhante()) return;
    }

    if (!wiz.consentimento) return mostrarErro("Para confirmar, precisamos da sua autorização para usar os dados.");
    wizIrPara(2);
}

async function carregarPresentesWizard() {
    wiz.carregandoPresentes = true;
    renderWizard();

    const listaFinal = [];

    if (typeof products !== "undefined" && Array.isArray(products)) {
        products.forEach(p => {
            listaFinal.push({
                uid: `pix-${p.id}`,
                dbId: null,
                tipo: "pix",
                livre: Boolean(p.isFreePix),
                nome: p.name,
                preco: p.price ?? null,
                imagem: p.image || null,
                emoji: p.fallbackEmoji || (p.isFreePix ? "💚" : "🎁"),
                link_amazon: null
            });
        });
    }

    try {
        const dadosAmazon = await supabaseFetch(
            "presentes?select=id,nome,preco,link_amazon,imagem&reservado=is.false&order=id.asc"
        );
        dadosAmazon.forEach(p => {
            listaFinal.push({
                uid: `amz-${p.id}`,
                dbId: p.id,
                tipo: "amazon",
                livre: false,
                nome: p.nome,
                preco: p.preco,
                imagem: p.imagem || null,
                emoji: "🎁",
                link_amazon: p.link_amazon
            });
        });
    } catch (e) {
        console.error("Erro ao carregar presentes da Amazon no wizard:", e);
        wiz.erro = "Não foi possível carregar os itens da Amazon. Você pode escolher um presente PIX ou pular esta etapa.";
    }

    wiz.presentes = listaFinal;
    if (wiz.presente && !wiz.presentes.some(p => p.uid === wiz.presente.uid)) {
        wiz.presente = null;
        wiz.presentePago = false;
    }
    wiz.carregandoPresentes = false;
    renderWizard();
}

function wizTrocarAba(aba) {
    wiz.aba = aba;
    renderWizard();
}

function wizSelecionarPresente(uid) {
    wiz.presente = wiz.presentes.find(p => p.uid === uid) || null;
    wiz.presentePago = false;
    wiz.erro = "";
    renderWizard();
    document.querySelector(".wiz-detalhe")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function wizTogglePresentePago(pago) {
    wiz.presentePago = Boolean(pago);
}

function wizLimparPresente() {
    wiz.presente = null;
    wiz.presentePago = false;
    wiz.pixValorLivre = "";
    renderWizard();
}

function wizPularPresente() {
    wiz.presente = null;
    wiz.presentePago = false;
    wiz.pixValorLivre = "";
    wizIrPara(3);
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

    const pixConfirmado = wiz.presente?.tipo === "pix" && wiz.presentePago;
    const amazonConfirmado = wiz.presente?.tipo === "amazon" && wiz.presentePago;
    const valorPixParaBanco = pixConfirmado ? obterValorPixAtual() : null;

    let res;
    try {
        res = await supabaseFetch("rpc/confirmar_presenca", {
            method: "POST",
            body: JSON.stringify({
                p_titular: wiz.titular,
                p_acompanhantes: wiz.acompanhantes,
                p_presente_id: amazonConfirmado ? wiz.presente.dbId : null,
                p_consentimento: wiz.consentimento,
                p_pix_nome: pixConfirmado ? wiz.presente.nome : null,
                p_pix_valor: valorPixParaBanco
            })
        });
    } catch (e) {
        console.error("Erro ao confirmar presença:", e);
        res = { ok: false, erro: "rede" };
    }
    wiz.enviando = false;

    if (res.ok) {
        wiz.passo = 4;
        renderWizard();
        return;
    }

    const quem = res.pessoa != null ? nomePessoa(res.pessoa) : "";
    switch (res.erro) {
        case "rg_ja_confirmado":
            wiz.passo = 1;
            return mostrarErro(quem
                ? `O RG de ${quem} já está com presença confirmada. Se precisar alterar algo, fale com os noivos.`
                : "Um dos RGs informados já está com presença confirmada.");
        case "rg_repetido":
            wiz.passo = 1;
            return mostrarErro(`O RG de ${quem} está repetido na lista.`);
        case "nome_invalido":
        case "rg_invalido":
            wiz.passo = 1;
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
    });
});