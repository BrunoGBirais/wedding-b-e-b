const countDownDate = new Date("2027-01-30T16:00:00").getTime();

function updateTimer() {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    if (distance < 0) return;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const daysElem = document.getElementById("days");
    if (daysElem) {
        daysElem.innerHTML = days < 10 ? "0" + days : days;
        document.getElementById("hours").innerHTML = hours < 10 ? "0" + hours : hours;
        document.getElementById("minutes").innerHTML = minutes < 10 ? "0" + minutes : minutes;
        document.getElementById("seconds").innerHTML = seconds < 10 ? "0" + seconds : seconds;
    }
}
updateTimer();
setInterval(updateTimer, 1000);

const products = [
    // --- Lua de Mel ---
    { id: 1, name: "Passagens lua de mel", price: 4196.60, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/passagens-lua-de-mel.jpg",fallbackEmoji: "✈️" },
    { id: 2, name: "Almoço para o casal lua de mel", price: 282.62, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/cafe-da-manha-lua-de-mel.jpg",fallbackEmoji: "🍽️" },
    { id: 3, name: "Café da manhã lua de mel", price: 230.59, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/almoco-lua-de-mel.jpg", fallbackEmoji: "🥐" },
    { id: 4, name: "Jantar lua de mel", price: 334.64, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/jantar-lua-de-mel.jpg",fallbackEmoji: "🍷" },
    { id: 5, name: "Um vale passeio na lua de mel para o casal", price: 261.81, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/passeio-lua-de-mel.jpg", fallbackEmoji: "🗺️" },
    { id: 6, name: "Uma rodada de caipirinhas ao casal", price: 126.55, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/rodada-caipirinha.jpg",fallbackEmoji: "🍹" },
    { id: 7, name: "Vale spa para a noiva", price: 398.87, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/spa-day-noiva-lua-de-mel.jpg", fallbackEmoji: "💆‍♀️" },
    { id: 8, name: "One Piece: em busca do tesouro do casal", price: 554.94, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/onepiece.jpg", fallbackEmoji: "🏴‍☠️" },
    { id: 9, name: "Trilha guiada com vista épica na lua de mel", price: 274.50, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/trilha.webp" },
    { id: 10, name: "Piquenique ao pôr do sol em um mirante especial", price: 196.40, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/piquenique.webp" },
    { id: 11, name: "Aluguel de carro para explorar praias e mirantes", price: 312.40, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/carro.avif"},
    { id: 12, name: "Degustação de vinhos e queijos lua de mel", price: 164.90, category: "Itens de Presentes na Lua de Mel", image:"img/presentes/vinhos.jpg" }
];

let cart = [];

function renderProducts() {
    const container = document.getElementById("gifts-container");
    container.innerHTML = "";

    const categories = [...new Set(products.map(p => p.category))];

    categories.forEach(category => {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category-group";
        
        const categoryTitle = document.createElement("h3");
        categoryTitle.className = "category-title";
        categoryTitle.innerText = category;
        categoryDiv.appendChild(categoryTitle);

        const gridDiv = document.createElement("div");
        gridDiv.className = "gifts-grid";

        const itemsInCategory = products.filter(p => p.category === category);
        itemsInCategory.forEach(product => {
            const priceFmt = product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
            const imgContent = product.image 
                ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 5px;">` 
                : product.fallbackEmoji;

            gridDiv.innerHTML += `
                <div class="gift-card" data-codigo-pix="${product.id}">
                    <div class="gift-img" style="display:flex;align-items:center;justify-content:center;font-size:3.5rem; overflow:hidden; position:relative;">${imgContent}</div>
                    <h4>${product.name}</h4>
                    <div class="price">R$ ${priceFmt}</div>
                    <button class="btn-presentear" onclick="addToCart(${product.id})">Presentear via PIX</button>
                </div>
            `;
        });

        categoryDiv.appendChild(gridDiv);
        container.appendChild(categoryDiv);
    });

    marcarPixReservados();
}

let codigosPixReservados = new Set();

async function marcarPixReservados() {
    // Os itens exclusivamente PIX são estáticos no site e não consultam a tabela Amazon
    return;
}

function addToCart(itemOrId) {
    let item;

    if (typeof itemOrId === "object" && itemOrId !== null) {
        // Veio de um produto da Amazon ("Dar valor via PIX ❖")
        item = {
            name: itemOrId.name,
            price: Number(itemOrId.price),
            supabaseId: itemOrId.supabaseId ?? null
        };
    } else {
        // Veio da lista original de presentes PIX
        if (typeof codigosPixReservados !== "undefined" && codigosPixReservados.has(itemOrId)) return;
        item = products.find(p => p.id === itemOrId);
    }

    if (!item) return;

    cart.push(item);

    document.getElementById('popup-texto-item').innerHTML = `<strong>${item.name}</strong> foi adicionado com sucesso ao carrinho dos noivos!`;
    document.getElementById('popup-confirmacao').style.display = 'flex';

    updateCartUI();
}

function fecharPopupConfirmacao() {
    document.getElementById('popup-confirmacao').style.display = 'none';
}

function irParaCarrinho() {
    document.getElementById('popup-confirmacao').style.display = 'none';
    openCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-items-list');
    const btnVoltar = document.querySelector('.btn-voltar-pix');
    if (btnVoltar) btnVoltar.style.display = 'none';

    if (cart.length === 0) {
        document.getElementById('cart-status-text').innerText = 'Carrinho vazio';
        list.innerHTML = '<p style="text-align:center; color:#888;">Seu carrinho está vazio.</p>';
        document.getElementById('cart-total-box').style.display = 'none';
        document.getElementById('btn-checkout').style.display = 'none';
        document.getElementById('pix-instructions').style.display = 'none';
        return;
    }

    document.getElementById('cart-status-text').innerText = ` ${cart.length} item(ns) selecionado(s)`;
    list.innerHTML = '';
    
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price;
        const priceFmt = item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        list.innerHTML += `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <button class="remove-btn" onclick="removeFromCart(${index})">Remover item</button>
                </div>
                <div style="font-weight: 600;">R$ ${priceFmt}</div>
            </div>`;
    });
    
    document.getElementById('cart-total-value').innerText = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('cart-total-box').style.display = 'block';
    document.getElementById('btn-checkout').style.display = 'block';
    document.getElementById('pix-instructions').style.display = 'none';
}

function openCart() {
    document.getElementById('cart-modal').style.display = 'flex';
    updateCartUI();
}

function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function checkoutPix() {
    const chavePix = typeof CHAVE_PIX_NOIVA !== "undefined" ? CHAVE_PIX_NOIVA : "44533749844";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chavePix).catch(() => {});
    }

    document.getElementById('btn-checkout').style.display = 'none';
    document.getElementById('pix-instructions').style.display = 'block';

    const avisoCopiado = document.getElementById('pix-copiado-aviso');
    if (avisoCopiado) avisoCopiado.style.display = 'block';

    const btnVoltar = document.querySelector('.btn-voltar-pix');
    if (btnVoltar) btnVoltar.style.display = 'inline-block';

    const nomeInput = document.getElementById('pix-nome-convidado');
    if (nomeInput) {
        nomeInput.value = '';
        nomeInput.focus();
    }
}

async function confirmarPagamentoPix() {
    const nomeInput = document.getElementById("pix-nome-convidado");
    const nome = nomeInput ? nomeInput.value.trim() : "";

    if (nome.length < 2) {
        alert("Por favor, informe seu nome para registrar o presente.");
        if (nomeInput) nomeInput.focus();
        return;
    }

    const itensAmazon = cart.filter(item => item.supabaseId !== null && item.supabaseId !== undefined);
    if (itensAmazon.length > 0 && typeof supabaseFetch === "function") {
        for (const item of itensAmazon) {
            try {
                await supabaseFetch("rpc/reservar_presente", {
                    method: "POST",
                    body: JSON.stringify({
                        p_id: item.supabaseId,
                        p_nome: `${nome} (PIX)`
                    })
                });
            } catch (e) {
                console.error("Erro ao dar baixa no item via PIX:", e);
            }
        }
        if (typeof carregarPresentesAmazon === "function") {
            await carregarPresentesAmazon();
        }
    }

    cart = [];
    updateCartUI();
    closeCart();
    alert(`Muito obrigado, ${nome}! Seu presente via PIX foi registrado com sucesso.`);
}

function voltarParaCarrinho() {
    document.getElementById('pix-instructions').style.display = 'none';

    const btnVoltar = document.querySelector('.btn-voltar-pix');
    if (btnVoltar) btnVoltar.style.display = 'none';

    document.getElementById('btn-checkout').style.display = 'block';
}

function confirmarPresenca() {
    const nome = document.getElementById('rsvp-name').value;
    
    if(nome) {
        const urlGoogleForms = "https://forms.gle/dEP5bN9yjrHWaKZt9";
        window.open(urlGoogleForms, '_blank');
    } else {
        document.getElementById('popup-rsvp-alerta').style.display = 'flex';
    }
}

function fecharRsvpAlerta() {
    document.getElementById('popup-rsvp-alerta').style.display = 'none';
}

function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('active');
}

function closeMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.remove('active');
}

window.onload = renderProducts;