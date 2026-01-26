// Elementos Principais
const modalOverlay = document.getElementById('modal-registro');
const modalOrigem = document.getElementById('modal-origem');
const listaAnexosDiv = document.getElementById('lista-anexos');
const btnEnviar = document.querySelector('.submit-btn');

// Elementos de Áudio
const btnAudio = document.getElementById('btn-audio');
const iconAudio = document.getElementById('icon-audio');
const txtAudio = document.getElementById('txt-audio');

// Estado da Aplicação
let listaAnexos = [];
let mediaTipoTemp = '';
let gravandoAudio = false;
let intervaloGravacao = null;
let segundosGravados = 0;
let gpsAtual = ""; // Guarda o GPS detectado

// Banco de Dados Local (Memória)
let dbManifestacoes = [];

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

// === BUSCA CEP (ViaCEP API) ===
function buscarCepResidencial(cep) {
    if (cep.length < 8) return;
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    // Mostra carregando
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

function buscarCepResidencialCli() {
    buscarCepResidencial(document.getElementById('input-cep-res').value);
}

// === GPS INTELIGENTE ===
function usarGPS() {
    const status = document.getElementById('gps-status');
    status.style.display = 'block';
    status.innerText = "🛰️ Buscando satélites (Modo Alta Precisão)...";
    status.style.color = "#E65100";

    const options = {
        enableHighAccuracy: true, // Tenta usar GPS real se disponível
        timeout: 10000,           // Espera até 10s
        maximumAge: 0             // Não aceita cache velho
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(6); // Aumentei precisão casas decimais
                const lng = pos.coords.longitude.toFixed(6);
                const precisao = pos.coords.accuracy ? `(Margem: ±${Math.round(pos.coords.accuracy)}m)` : "";

                gpsAtual = `${lat}, ${lng}`;

                // Preenche o campo de endereço da ocorrência
                document.getElementById('input-end-ocorrencia').value = `Minha Localização Atual (${gpsAtual})`;
                document.getElementById('input-end-ocorrencia').style.border = "2px solid #4CAF50";

                status.innerText = `✅ Localização capturada! ${precisao}`;
                status.style.color = "#2F855A";
            },
            (err) => {
                let msg = "Erro desconhecido.";
                if (err.code === 1) msg = "Permissão negada. Ative a localização.";
                if (err.code === 2) msg = "Sinal indisponível (Tente em área aberta).";
                if (err.code === 3) msg = "Tempo esgotado. Tente novamente.";

                status.innerText = `❌ ${msg}`;
                status.style.color = "#C53030";
            },
            options
        );
    } else {
        status.innerText = "❌ GPS não suportado neste navegador.";
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

function abrirModalOrigem(tipo) {
    mediaTipoTemp = tipo;
    modalOrigem.classList.remove('hidden');
    modalOrigem.style.visibility = 'visible';
    modalOrigem.style.opacity = '1';
}

function fecharModalOrigem() {
    modalOrigem.style.opacity = '0';
    setTimeout(() => {
        modalOrigem.style.visibility = 'hidden';
        modalOrigem.classList.add('hidden');
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

    listaAnexos = [];
    renderizarListaAnexos();
    btnEnviar.innerText = "REGISTRAR PROTOCOLO";
    btnEnviar.style.background = "#4CAF50";
    if (gravandoAudio) pararGravacao(false);
}

// === MÍDIA ===
function selecionarOrigem(usarCamera) {
    fecharModalOrigem();
    let inputId = (mediaTipoTemp === 'Imagem') ? 'cameraInput' : 'videoInput';
    const input = document.getElementById(inputId);
    input.removeAttribute('capture');
    if (usarCamera) input.setAttribute('capture', 'environment');
    setTimeout(() => { input.click(); }, 200);
}

function midiaSelecionada(input, tipoIcone) {
    if (input.files[0]) {
        if (input.files[0].size > 10 * 1024 * 1024) {
            alert("⚠️ Arquivo > 10MB."); return;
        }
        listaAnexos.push({ nome: input.files[0].name, tipo: tipoIcone });
        renderizarListaAnexos();
        input.value = '';
    }
}

// === ÁUDIO ===
function toggleGravacao() {
    if (!gravandoAudio) iniciarGravacao();
    else pararGravacao(true);
}

function iniciarGravacao() {
    gravandoAudio = true; segundosGravados = 0;
    btnAudio.style.background = "#FEE2E2"; btnAudio.style.border = "1px solid #F56565";
    iconAudio.style.color = "#E53E3E"; iconAudio.innerText = "stop_circle";
    txtAudio.style.color = "#E53E3E"; txtAudio.innerText = "00:00";
    intervaloGravacao = setInterval(() => {
        segundosGravados++;
        const m = Math.floor(segundosGravados / 60).toString().padStart(2, '0');
        const s = (segundosGravados % 60).toString().padStart(2, '0');
        txtAudio.innerText = `${m}:${s}`;
    }, 1000);
}

function pararGravacao(salvar) {
    gravandoAudio = false; clearInterval(intervaloGravacao);
    btnAudio.style.background = "white"; btnAudio.style.border = "1px solid #CBD5E0";
    iconAudio.style.color = "#3182CE"; iconAudio.innerText = "mic";
    txtAudio.style.color = "#4A5568"; txtAudio.innerText = "Áudio";
    if (salvar) {
        listaAnexos.push({ nome: `Audio_${Date.now()}.mp3`, tipo: "🎤 Áudio" });
        renderizarListaAnexos();
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
        d.innerHTML = `<span>${item.tipo} ${item.nome}</span> <span style="color:red;cursor:pointer;" onclick="removerAnexo(${index})">X</span>`;
        listaAnexosDiv.appendChild(d);
    });
}
function removerAnexo(i) { listaAnexos.splice(i, 1); renderizarListaAnexos(); }

// === ENVIO COM INTELIGÊNCIA E SEGURANÇA ===
function enviarRelato() {
    // 1. Coleta Dados dos Campos (com trim para limpar espaços)
    let nome = document.getElementById('input-nome').value.trim();
    let cpf = document.getElementById('input-cpf').value.trim();
    let tel = document.getElementById('input-tel').value.trim();
    let email = document.getElementById('input-email').value.trim();

    let cepRes = document.getElementById('input-cep-res').value;
    let endRes = document.getElementById('input-end-res').value + ', ' + document.getElementById('input-num-res').value;

    const titulo = document.getElementById('input-titulo').value.trim();
    const endOcorrencia = document.getElementById('input-end-ocorrencia').value;
    const texto = document.getElementById('texto-relato').value.trim();

    // === TRAVA DE SEGURANÇA (EXTRAÇÃO AUTOMÁTICA) ===
    // Se o cidadão esqueceu de preencher algo, tentamos achar no texto
    // Se ele preencheu, o valor dos campos tem prioridade (não entra no if)

    if (!cpf) {
        // RegEx CPF: xxx.xxx.xxx-xx ou apenas números
        const matchCpf = texto.match(/(\d{3}[\.]?\d{3}[\.]?\d{3}[-]?\d{2})/);
        if (matchCpf) cpf = matchCpf[0];
    }

    if (!email) {
        // RegEx Email
        const matchEmail = texto.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (matchEmail) email = matchEmail[0];
    }

    if (!tel) {
        // RegEx Tel: (61) 9xxxx, 61 9xxxx, 9xxxx-xxxx
        const matchTel = texto.match(/(\(?\d{2}\)?\s?)?(9\d{4}[-\s]?\d{4})/);
        if (matchTel) tel = matchTel[0];
    }

    // Validação Mínima Obrigatória
    if (!titulo || !texto) {
        alert("⚠️ Atenção: É obrigatório informar o Título e a Descrição do problema.");
        return;
    }

    btnEnviar.innerText = "Processando Dados...";
    const protocolo = '2026-' + Math.floor(Math.random() * 90000);
    const agora = new Date();

    const anexosStr = listaAnexos.map(a => `[${a.tipo}] ${a.nome}`).join(' | ');

    // Salva no Banco de Dados com os dados (Recuperados ou Não)
    dbManifestacoes.unshift({
        prot: protocolo,
        data: agora.toLocaleDateString(),
        hora: agora.toLocaleTimeString(),
        status: 'EM ANÁLISE',
        cidadao_nome: nome || "Anônimo / Não Informado",
        cidadao_cpf: cpf || "Não Identificado",
        cidadao_tel: tel || "Não Identificado",
        cidadao_email: email || "Não Informado",
        cidadao_end: (endRes.length > 5 && cepRes) ? `${endRes} (CEP: ${cepRes})` : "Não Informado",
        ocorrencia_titulo: titulo,
        ocorrencia_local: endOcorrencia || "Não Informado",
        ocorrencia_desc: texto,
        gps_tecnico: gpsAtual || "Não capturado",
        anexos: anexosStr
    });

    setTimeout(() => {
        let aviso = "";
        if (!nome && !cpf) aviso = "\n(Protocolo registrado como ANÔNIMO - Dados não identificados)";

        alert(`✅ Protocolo: ${protocolo}\nManifestação registrada com sucesso!${aviso}`);
        adicionarHistorico(titulo, agora.toLocaleDateString());
        closeModal();
    }, 1500);
}

function adicionarHistorico(tit, data) {
    const l = document.getElementById('historico-lista');
    const d = document.createElement('div');
    d.className = 'manifestation-item';
    d.innerHTML = `<div class="status" style="background:#E6FFFA;color:#2C7A7B">NOVO</div><h4>${tit}</h4><p>${data}</p>`;
    // Adiciona no topo
    if (l.firstChild) l.insertBefore(d, l.firstChild);
    else l.appendChild(d);
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
