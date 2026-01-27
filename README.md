# 📱 Participa DF - App Cidadão (PWA)

> **Solução de Ouvidoria Digital Multimídia e Offline-First**

![Status](https://img.shields.io/badge/Status-Funcional-green)
![Tecnologia](https://img.shields.io/badge/Tecnologia-PWA-blue)

Este projeto é uma **Progressive Web Application (PWA)** desenvolvida para o **Desafio Participa DF (Categoria Ouvidoria)**. O objetivo é modernizar o canal de comunicação entre cidadão e governo, permitindo registros ricos em mídia e localização precisa.

---

## ✨ Principais Funcionalidades

1.  **📲 Instalação Nativa (PWA):**
    *   Funciona como um aplicativo nativo no Android e iOS.
    *   Pode ser instalado diretamente pelo navegador ("Adicionar à Tela Inicial").
    *   Ícone personalizado e tela de splash.

2.  **📡 Funcionamento Offline:**
    *   Graças ao `Service Worker` avançado, o app carrega instantaneamente mesmo sem internet.
    *   Permite consultar o histórico e navegar na interface offline.

3.  **📸 Multimídia Integrada:**
    *   **Áudio:** Captura de voz para relatos rápidos.
    *   **Vídeo:** Gravação de evidências em vídeo.
    *   **Foto:** Integração direta com a câmera do dispositivo.
    *   **Texto:** Campo de relato detalhado.

4.  **📍 Geolocalização Automática:**
    *   Captura as coordenadas GPS exatas do problema no momento do relato.

---

## 🛠️ Tecnologias Utilizadas

*   **HTML5 Semântico:** Estrutura acessível e moderna.
*   **CSS3 (Modern Layouts):** Design responsivo com Grid e Flexbox.
*   **JavaScript (ES6+):** Lógica de captura de mídia e geolocalização.
*   **Service Workers:** Cache e suporte offline.
*   **Manifest JSON:** Configuração de instalabilidade mobile.

---

## 🚀 Como Testar (Demo Online)

Acesse o aplicativo diretamente pelo seu navegador (Celular ou Desktop):
👉 **[CLIQUE AQUI PARA ABRIR O APP](https://oleandrosan.github.io/participa-df-app)** (Link disponível após ativação do GitHub Pages)

### 📲 Como Instalar no Celular:

1.  **Android (Chrome):** Acesse o link e toque em "Adicionar à Tela Inicial" na barra inferior.
2.  **iOS (Safari):** Toque no botão "Compartilhar" e escolha "Adicionar à Tela de Início".
3.  **PC/Mac (Chrome/Edge):** Clique no ícone de "Download/Instalar" na barra de endereços.

---

## 📂 Estrutura do Projeto

*   `index.html`: Interface principal.
*   `style.css`: Estilização e design responsivo.
*   `app.js`: Lógica de interação, câmera, áudio e GPS.
*   `service-worker.js`: Gerenciamento de cache e offline.
*   `manifest.json`: Metadados do aplicativo.

---

Desenvolvido para fortalecer a cidadania e a transparência no Distrito Federal. 🏛️🇧🇷
