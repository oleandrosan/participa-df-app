// Elementos Principais
const modalOverlay = document.getElementById('modal-registro');
const listaAnexosDiv = document.getElementById('lista-anexos');
const btnEnviar = document.querySelector('.submit-btn');

// Elementos de Áudio
const btnAudio = document.getElementById('btn-audio');
const iconAudio = document.getElementById('icon-audio');
const txtAudio = document.getElementById('txt-audio');

// Estado da Aplicação
let listaAnexos = [];
let gravandoAudio = false;
let intervaloGravacao = null;
let segundosGravados = 0;
let gpsAtual = "";
let mediaRecorder = null;
let audioChunks = [];

// Banco de Dados Local (Memória - apenas para exportação na sessão atual)
let dbManifestacoes = [];

// === INDEXED DB (PERSISTENCIA DE ARQUIVOS) ===
const DB_NAME = 'ParticipaDF_DB';
const STORE_NAME = 'anexos';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => {
            console.error("Erro no IndexedDB:", event.target.error);
            reject(event.target.error);
        };
    });
}

async function salvarAnexoNoBanco(anexo) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(anexo);
        request.onsuccess = () => resolve(anexo);
        request.onerror = (e) => reject(e);
    });
}

async function carregarAnexosDoBanco() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
}

async function removerAnexoDoBanco(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

async function limparBancoAnexos() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

// === PERSISTÊNCIA DE ESTADO (TEXTO + GPS) ===
function salvarEstadoTemp() {
    const dados = {
        nome: document.getElementById('input-nome').value,
        cpf: document.getElementById('input-cpf').value,
        tel: document.getElementById('input-tel').value,
        email: document.getElementById('input-email').value,
        cep: document.getElementById('input-cep-res').value,
        endRes: document.getElementById('input-end-res').value,
        numRes: document.getElementById('input-num-res').value,
        titulo: document.getElementById('input-titulo').value,
        endOcorrencia: document.getElementById('input-end-ocorrencia').value,
        texto: document.getElementById('texto-relato').value,
        gps: gpsAtual,
        timestamp: Date.now()
    };
    localStorage.setItem('participa_df_temp_v2', JSON.stringify(dados));
}

async function restaurarEstadoTemp() {
    // 1. Restaura campos de texto
    const salvo = localStorage.getItem('participa_df_temp_v2');
    let dados = {};
    if (salvo) {
        try {
            dados = JSON.parse(salvo);
            // Só restaura se foi salvo há menos de 24h
            if (Date.now() - dados.timestamp < 24 * 60 * 60 * 1000) {
                console.log("Restaurando textos...");
                document.getElementById('input-nome').value = dados.nome || '';
                document.getElementById('input-cpf').value = dados.cpf || '';
                document.getElementById('input-tel').value = dados.tel || '';
                document.getElementById('input-email').value = dados.email || '';
                document.getElementById('input-cep-res').value = dados.cep || '';
                document.getElementById('input-end-res').value = dados.endRes || '';
                document.getElementById('input-num-res').value = dados.numRes || '';
                document.getElementById('input-titulo').value = dados.titulo || '';
                document.getElementById('input-end-ocorrencia').value = dados.endOcorrencia || '';
                document.getElementById('texto-relato').value = dados.texto || '';

                if (dados.gps) {
                    gpsAtual = dados.gps;
                    document.getElementById('gps-status').style.display = 'block';
                    document.getElementById('gps-status').innerText = "📍 Localização restaurada";
                }
            }
        } catch (e) {
            console.error("Erro ao restaurar texto:", e);
        }
    }

    // 2. Restaura ANEXOS (DB)
    try {
        const anexosSalvos = await carregarAnexosDoBanco();
        if (anexosSalvos && anexosSalvos.length > 0) {
            listaAnexos = anexosSalvos;
            renderizarListaAnexos();
        }

        // 3. Verifica se deve reabrir o modal (Se tem QUALQUER dado relevante)
        const temDadosTexto = (dados.nome || dados.titulo || dados.texto || dados.cpf || dados.gps);
        const temAnexos = (listaAnexos.length > 0);

        if (temDadosTexto || temAnexos) {
            // Pequeno delay para garantir que o DOM esteja pronto e estável
            setTimeout(() => {
                openModal();
                mostrarAvisoRestauracao();
            }, 500);
        }

    } catch (e) {
        console.error("Erro ao restaurar anexos:", e);
    }
}

function mostrarAvisoRestauracao() {
    // Evita duplicar avisos
    if (document.querySelector('.aviso-restauracao')) return;

    const aviso = document.createElement('div');
    aviso.className = 'aviso-restauracao';
    aviso.innerText = "🔄 Continuando de onde você parou...";
    aviso.style.cssText = "background:#E6FFFA; color:#2C7A7B; padding:10px; margin-bottom:10px; border-radius:8px; text-align:center; font-weight:bold;";

    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
        modalBody.prepend(aviso);
        setTimeout(() => aviso.remove(), 4000);
    }
}

function limparEstadoTemp() {
    localStorage.removeItem('participa_df_temp_v2');
    limparBancoAnexos(); // Limpa também os arquivos
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); // Inicia o banco
    restaurarEstadoTemp(); // Restaura tudo

    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(inp => {
        inp.addEventListener('input', salvarEstadoTemp);
        inp.addEventListener('blur', salvarEstadoTemp);
    });
});

// === MÁSCARAS DE INPUT (CPF e TEL) ===
function mascaraCPF(i) {
    var v = i.value;
    if (isNaN(v[v.length - 1])) {
        i.value = v.substring(0, v.length - 1);
        return;
    }
    i.setAttribute("maxlength", "14");
    if (v.length == 3 || v.length == 7) i.value += ".";
    if (v.length == 11) i.value += "-";
}

function mascaraTel(i) {
    var v = i.value;
    if (isNaN(v[v.length - 1])) {
        i.value = v.substring(0, v.length - 1);
        return;
    }
    i.setAttribute("maxlength", "15");
    if (v.length == 1) i.value = "(" + i.value;
    if (v.length == 3) i.value += ") ";
    if (v.length == 10) i.value += "-";
}

// === BUSCA CEP ===
function buscarCepResidencial(cep) {
    if (cep.length < 8) return;
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    document.getElementById('input-end-res').value = "Buscando endereço...";
    fetch(url).then(response => response.json()).then(data => {
        if (data.erro) {
            document.getElementById('input-end-res').value = "CEP não encontrado.";
        } else {
            document.getElementById('input-end-res').value = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
            document.getElementById('input-cep-res').style.borderColor = "#4CAF50";
        }
    }).catch(e => {
        document.getElementById('input-end-res').value = "Erro ao buscar CEP.";
    });
}

// === GPS ===
function usarGPS() {
    const status = document.getElementById('gps-status');
    status.style.display = 'block';
    status.innerText = "🛰️ Buscando satélites...";
    status.style.color = "#E65100";

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                gpsAtual = `${lat}, ${lng}`;
                document.getElementById('input-end-ocorrencia').value = `Minha Localização (${gpsAtual})`;
                document.getElementById('input-end-ocorrencia').style.border = "2px solid #4CAF50";
                status.innerText = `✅ Localização capturada!`;
                status.style.color = "#2F855A";
                salvarEstadoTemp();
            },
            (err) => {
                status.innerText = "❌ Erro ao obter GPS.";
                status.style.color = "#C53030";
            },
            options
        );
    } else {
        status.innerText = "❌ GPS não suportado.";
    }
}

// === MODAIS ===
function openModal() {
    modalOverlay.classList.remove('hidden');
    modalOverlay.style.visibility = 'visible';
    modalOverlay.style.opacity = '1';
}

function closeModal() {
    modalOverlay.style.opacity = '0';
    setTimeout(() => {
        modalOverlay.style.visibility = 'hidden';
        modalOverlay.classList.add('hidden');
        resetarFormulario();
    }, 300);
}

function resetarFormulario() {
    document.getElementById('input-nome').value = '';
    document.getElementById('input-cpf').value = '';
    document.getElementById('input-tel').value = '';
    document.getElementById('input-email').value = '';
    document.getElementById('input-cep-res').value = '';
    document.getElementById('input-end-res').value = '';
    document.getElementById('input-num-res').value = '';
    document.getElementById('input-titulo').value = '';
    document.getElementById('input-end-ocorrencia').value = '';
    document.getElementById('texto-relato').value = '';

    gpsAtual = "";
    document.getElementById('gps-status').style.display = 'none';

    // Limpa estado global
    listaAnexos = [];
    renderizarListaAnexos();

    // UI resets
    btnEnviar.innerText = "REGISTRAR PROTOCOLO";
    btnEnviar.style.background = "#4CAF50";
    if (gravandoAudio) pararGravacao(false);

    limparEstadoTemp();
}

// === MÍDIA (Simplificado: Galeria ou Câmera via Sistema) ===
function abrirSeletor(tipo) {
    // tipo: 'Imagem' ou 'Video'
    // Abre direto o seletor nativo, sem modal intermediário.
    // O usuário escolhe Câmera ou Arquivos no menu do próprio celular.

    let inputId = (tipo === 'Imagem') ? 'cameraInput' : 'videoInput';
    const input = document.getElementById(inputId);

    // Limpa value para garantir que dispara onchange mesmo se selecionar mesmo arquivo
    input.value = '';

    // Garante que não está forçando capture (evita bugs de reload no Android)
    input.removeAttribute('capture');

    setTimeout(() => { input.click(); }, 100);
}

async function midiaSelecionada(input, tipoIcone) {
    if (input.files && input.files[0]) {
        const arquivo = input.files[0];

        // Validação de tamanho (50MB)
        if (arquivo.size > 50 * 1024 * 1024) {
            alert("⚠️ Arquivo muito grande (Máximo 50MB).");
            input.value = ''; // Limpa
            return;
        }

        const id = Date.now().toString();
        const novoAnexo = {
            id: id,
            nome: arquivo.name,
            tipo: tipoIcone,
            blob: arquivo
        };

        try {
            // Salva no IndexedDB
            await salvarAnexoNoBanco(novoAnexo);

            // Atualiza UI
            listaAnexos.push(novoAnexo);
            renderizarListaAnexos();

            alert("✅ Arquivo anexado com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar anexo:", e);
            alert("Erro ao salvar a mídia. Tente novamente.");
        } finally {
            input.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo se quiser
        }
    }
}

// === ÁUDIO (REAL via MediaRecorder) ===
function toggleGravacao() {
    if (!gravandoAudio) iniciarGravacao();
    else pararGravacao(true);
}
// ... restante do código de áudio ...

async function iniciarGravacao() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Seu navegador não suporta gravação de áudio.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const id = Date.now().toString();
                const novoAudio = {
                    id: id,
                    nome: `Audio_${id}.webm`,
                    tipo: "🎤 Áudio",
                    blob: audioBlob
                };

                try {
                    await salvarAnexoNoBanco(novoAudio);
                    listaAnexos.push(novoAudio);
                    renderizarListaAnexos();
                } catch (e) {
                    console.error("Erro ao salvar áudio:", e);
                }
            }
        };

        mediaRecorder.start();
        gravandoAudio = true;
        segundosGravados = 0;
        atualizarUIGravando(true);

        intervaloGravacao = setInterval(() => {
            segundosGravados++;
            const m = Math.floor(segundosGravados / 60).toString().padStart(2, '0');
            const s = (segundosGravados % 60).toString().padStart(2, '0');
            txtAudio.innerText = `${m}:${s}`;
        }, 1000);

    } catch (err) {
        console.error("Erro ao iniciar gravação:", err);
        alert("Permissão de microfone negada ou erro no dispositivo.");
    }
}

function pararGravacao(salvar) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop(); // Dispara o onstop que salva

        // Se não for para salvar, precisamos limpar o buffer depois?
        // Na verdade o onstop vai rodar. Se cancelar, deveriamos ignorar no onstop.
        // Simplificação: onstop salva, se cancelar usuário exclui na lista.
    }

    gravandoAudio = false;
    clearInterval(intervaloGravacao);
    atualizarUIGravando(false);

    // Stop tracks para liberar microfone
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function atualizarUIGravando(gravando) {
    if (gravando) {
        btnAudio.style.background = "#FEE2E2";
        btnAudio.style.border = "1px solid #F56565";
        iconAudio.style.color = "#E53E3E";
        iconAudio.innerText = "stop_circle";
        txtAudio.style.color = "#E53E3E";
        txtAudio.innerText = "00:00";
    } else {
        btnAudio.style.background = "white";
        btnAudio.style.border = "1px solid #CBD5E0";
        iconAudio.style.color = "#3182CE";
        iconAudio.innerText = "mic";
        txtAudio.style.color = "#4A5568";
        txtAudio.innerText = "Áudio";
    }
}

// === RENDERIZAÇÃO ===
function renderizarListaAnexos() {
    listaAnexosDiv.innerHTML = '';
    if (!listaAnexos.length) { listaAnexosDiv.style.display = 'none'; return; }
    listaAnexosDiv.style.display = 'block';

    listaAnexos.forEach((item, index) => {
        const d = document.createElement('div');
        d.className = 'anexo-item';
        d.style.cssText = "display:flex;justify-content:space-between;background:#E2E8F0;padding:10px;margin-bottom:5px;border-radius:8px;";
        d.innerHTML = `<span>${item.tipo} ${item.nome}</span> <span style="color:red;cursor:pointer;" onclick="removerAnexo('${item.id}', ${index})">X</span>`;
        listaAnexosDiv.appendChild(d);
    });
}

async function removerAnexo(id, index) {
    try {
        await removerAnexoDoBanco(id);
        listaAnexos.splice(index, 1);
        renderizarListaAnexos();
    } catch (e) {
        console.error("Erro ao remover:", e);
    }
}

// === ENVIO ===
function enviarRelato() {
    let nome = document.getElementById('input-nome').value.trim();
    let cpf = document.getElementById('input-cpf').value.trim();
    let tel = document.getElementById('input-tel').value.trim();
    let email = document.getElementById('input-email').value.trim();
    let cepRes = document.getElementById('input-cep-res').value;
    let endRes = document.getElementById('input-end-res').value + ', ' + document.getElementById('input-num-res').value;
    const titulo = document.getElementById('input-titulo').value.trim();
    const endOcorrencia = document.getElementById('input-end-ocorrencia').value;
    const texto = document.getElementById('texto-relato').value.trim();

    // Extração inteligente (se vazio)
    if (!cpf) {
        const matchCpf = texto.match(/(\d{3}[\.]?\d{3}[\.]?\d{3}[-]?\d{2})/);
        if (matchCpf) cpf = matchCpf[0];
    }
    if (!email) {
        const matchEmail = texto.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (matchEmail) email = matchEmail[0];
    }
    if (!tel) {
        const matchTel = texto.match(/(\(?\d{2}\)?\s?)?(9\d{4}[-\s]?\d{4})/);
        if (matchTel) tel = matchTel[0];
    }

    if (!titulo || !texto) {
        alert("⚠️ Atenção: Informe Título e Descrição.");
        return;
    }

    btnEnviar.innerText = "Processando Dados...";
    const protocolo = '2026-' + Math.floor(Math.random() * 90000);
    const agora = new Date();

    const anexosStr = listaAnexos.map(a => `[${a.tipo}] ${a.nome}`).join(' | ');

    dbManifestacoes.unshift({
        prot: protocolo,
        data: agora.toLocaleDateString(),
        hora: agora.toLocaleTimeString(),
        status: 'EM ANÁLISE',
        cidadao_nome: nome || "Anônimo",
        cidadao_cpf: cpf || "Não Id.",
        cidadao_tel: tel || "Não Id.",
        cidadao_email: email || "Não Inf.",
        cidadao_end: (endRes.length > 5 && cepRes) ? `${endRes}` : "Não Inf.",
        ocorrencia_titulo: titulo,
        ocorrencia_local: endOcorrencia || "Não Informado",
        ocorrencia_desc: texto,
        gps_tecnico: gpsAtual || "Não capturado",
        anexos: anexosStr
    });

    setTimeout(() => {
        alert(`✅ Protocolo: ${protocolo}\nManifestação registrada com sucesso!`);
        adicionarHistorico(titulo, agora.toLocaleDateString());
        closeModal();
    }, 1500);
}

function adicionarHistorico(tit, data) {
    const l = document.getElementById('historico-lista');
    const d = document.createElement('div');
    d.className = 'manifestation-item';
    d.innerHTML = `<div class="status" style="background:#E6FFFA;color:#2C7A7B">NOVO</div><h4>${tit}</h4><p>${data}</p>`;
    if (l.firstChild) l.insertBefore(d, l.firstChild);
    l.appendChild(d);
}

// === EXPORTAR CSV ===
function exportarCSV() {
    if (dbManifestacoes.length === 0) { alert("Nenhuma manifestação registrada."); return; }
    let csv = "\uFEFFProtocolo;Data;Hora;Status;Nome;CPF;Tel;Email;End_Residencial;Titulo_Ocorrencia;Local_Ocorrencia;Descricao;GPS_Tecnico;Anexos\n";
    dbManifestacoes.forEach(i => {
        const descLimpa = i.ocorrencia_desc.replace(/(\r\n|\n|\r)/gm, " ");
        csv += `${i.prot};${i.data};${i.hora};${i.status};${i.cidadao_nome};${i.cidadao_cpf};${i.cidadao_tel};${i.cidadao_email};${i.cidadao_end};${i.ocorrencia_titulo};${i.ocorrencia_local};${descLimpa};${i.gps_tecnico};${i.anexos}\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `Ouvidoria_DF_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js'); });
}

// === GESTOR ===
function abrirAreaGestor() {
    const modal = document.getElementById('modal-gestor');
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('painel-gestor').style.display = 'none';
    modal.classList.remove('hidden');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    document.getElementById('input-senha-gestor').value = '';
}

function fecharModalGestor() {
    const modal = document.getElementById('modal-gestor');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.visibility = 'hidden';
        modal.classList.add('hidden');
    }, 300);
}

function verificarSenhaGestor() {
    const senha = document.getElementById('input-senha-gestor').value;
    if (senha === 'admin') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('painel-gestor').style.display = 'block';
        document.getElementById('total-registros').innerText = dbManifestacoes.length;
    } else {
        alert('Senha incorreta! Tente "admin"');
    }
}
