// Lista de presentes da Amazon, com reserva via Supabase (usa js/supabase-config.js).
const AMAZON_LISTA_URL = "https://www.amazon.com.br/hz/wishlist/ls/22PKCUWC4NWXW";
const INTERVALO_ATUALIZACAO_MS = 30000;

let presentesAmazon = [];
let presenteSelecionado = null;

async function carregarPresentesAmazon() {
    const container = document.getElementById("amazon-gifts-container");
    if (!container) return;

    try {
        presentesAmazon = await supabaseFetch(
            "presentes?select=id,nome,preco,link_amazon,imagem,reservado&order=reservado.asc,id.asc"
        );
        renderPresentesAmazon();
    } catch (e) {
        console.error("Erro ao carregar presentes da Amazon:", e);
        if (presentesAmazon.length === 0) {
            container.innerHTML = '<p class="amazon-msg">Não foi possível carregar os presentes agora. Tente novamente em instantes.</p>';
        }
    }
}

function renderPresentesAmazon() {
    const container = document.getElementById("amazon-gifts-container");
    container.innerHTML = "";

    if (presentesAmazon.length === 0) {
        container.innerHTML = '<p class="amazon-msg">Nenhum presente cadastrado ainda.</p>';
        return;
    }

    presentesAmazon.forEach(p => {
        const card = document.createElement("div");
        card.className = "gift-card" + (p.reservado ? " gift-card--reservado" : "");

        const imgBox = document.createElement("div");
        imgBox.className = "gift-img amazon-gift-img";
        if (p.imagem) {
            const img = document.createElement("img");
            img.src = p.imagem;
            img.alt = p.nome;
            img.loading = "lazy";
            imgBox.appendChild(img);
        } else {
            imgBox.textContent = "🎁";
        }
        if (p.reservado) {
            const selo = document.createElement("span");
            selo.className = "selo-reservado";
            selo.textContent = "Já presenteado 💝";
            imgBox.appendChild(selo);
        }

        const nome = document.createElement("h4");
        nome.className = "amazon-gift-nome";
        nome.textContent = p.nome;
        nome.title = p.nome;

        const preco = document.createElement("div");
        preco.className = "price";
        preco.textContent = formatarPreco(p.preco);

        card.append(imgBox, nome, preco);

        if (!p.reservado) {
            const acoes = document.createElement("div");
            acoes.className = "amazon-acoes";

            const linkAmazon = document.createElement("a");
            linkAmazon.className = "btn-amazon";
            linkAmazon.href = p.link_amazon;
            linkAmazon.target = "_blank";
            linkAmazon.rel = "noopener noreferrer";
            linkAmazon.textContent = "Comprar na Amazon";

            acoes.appendChild(linkAmazon);

            if (p.preco !== null && p.preco > 0 && typeof addToCart === "function") {
                const btnPix = document.createElement("button");
                btnPix.className = "btn-presentear";
                btnPix.textContent = "Dar valor via PIX ❖";
                btnPix.onclick = () => addToCart({
                    name: p.nome,
                    price: Number(p.preco),
                    supabaseId: p.id
                });
                acoes.appendChild(btnPix);
            }

            card.appendChild(acoes);
        }

        container.appendChild(card);
    });
}

function abrirReserva(id) {
    presenteSelecionado = presentesAmazon.find(p => p.id === id);
    if (!presenteSelecionado) return;

    document.getElementById("reserva-nome-presente").textContent = presenteSelecionado.nome;
    document.getElementById("reserva-nome-convidado").value = "";
    document.getElementById("reserva-erro").textContent = "";
    document.getElementById("reserva-form").style.display = "block";
    document.getElementById("reserva-resultado").style.display = "none";
    document.getElementById("btn-confirmar-reserva").disabled = false;
    document.getElementById("popup-reserva").style.display = "flex";
    document.getElementById("reserva-nome-convidado").focus();
}

function fecharReserva() {
    document.getElementById("popup-reserva").style.display = "none";
    presenteSelecionado = null;
}

async function confirmarReserva() {
    const nome = document.getElementById("reserva-nome-convidado").value.trim();
    const erroEl = document.getElementById("reserva-erro");
    const btn = document.getElementById("btn-confirmar-reserva");

    if (nome.length < 2) {
        erroEl.textContent = "Por favor, informe seu nome.";
        return;
    }

    btn.disabled = true;
    erroEl.textContent = "";

    try {
        const ok = await supabaseFetch("rpc/reservar_presente", {
            method: "POST",
            body: JSON.stringify({ p_id: presenteSelecionado.id, p_nome: nome })
        });

        mostrarResultadoReserva(ok
            ? { icone: "🤍", titulo: "Muito obrigado!", texto: `Registramos que você nos presenteou com <strong></strong>. Ele não aparecerá mais como disponível para os outros convidados.` }
            : { icone: "🙈", titulo: "Ops!", texto: `Alguém acabou de marcar <strong></strong> como presenteado. Que tal escolher outro item da lista?` }
        );
        await carregarPresentesAmazon();
    } catch (e) {
        console.error("Erro ao reservar presente:", e);
        erroEl.textContent = "Não foi possível registrar agora. Tente novamente.";
        btn.disabled = false;
    }
}

function mostrarResultadoReserva({ icone, titulo, texto }) {
    document.getElementById("reserva-form").style.display = "none";
    document.getElementById("reserva-resultado-icone").textContent = icone;
    document.getElementById("reserva-resultado-titulo").textContent = titulo;
    const textoEl = document.getElementById("reserva-resultado-texto");
    textoEl.innerHTML = texto;
    textoEl.querySelector("strong").textContent = presenteSelecionado.nome;
    document.getElementById("reserva-resultado").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    const linkLista = document.getElementById("amazon-lista-link");
    if (linkLista) linkLista.href = AMAZON_LISTA_URL;

    const input = document.getElementById("reserva-nome-convidado");
    if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") confirmarReserva(); });

    carregarPresentesAmazon();
    setInterval(() => { if (!document.hidden) carregarPresentesAmazon(); }, INTERVALO_ATUALIZACAO_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarPresentesAmazon(); });
});