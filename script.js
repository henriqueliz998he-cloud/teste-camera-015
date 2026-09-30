const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const btnIniciar = document.getElementById("btnIniciar");
const btnTrocar = document.getElementById("btnTrocar");
const btnFoto = document.getElementById("btnFoto");
const btnParar = document.getElementById("btnParar");

const btnBaixar = document.getElementById("btnBaixar");
const btnApagar = document.getElementById("btnApagar");

const statusTexto = document.getElementById("status");
const cameraAtual = document.getElementById("cameraAtual");
const quantidadeCameras = document.getElementById("quantidadeCameras");
const permissao = document.getElementById("permissao");
const resolucao = document.getElementById("resolucao");
const orientacao = document.getElementById("orientacao");
const resultadoTestes = document.getElementById("resultadoTestes");
const placeholder = document.getElementById("camera-placeholder");

let streamAtual = null;
let cameras = [];
let indiceCamera = 0;
let ultimaFoto = null;

function atualizarStatus(texto, tipo = "") {
  statusTexto.textContent = texto;
  statusTexto.className = tipo;
}

function adicionarTeste(texto, tipo = "") {
  const p = document.createElement("p");

  p.textContent = texto;

  if (tipo) {
    p.className = tipo;
  }

  resultadoTestes.appendChild(p);
}

function limparTestes() {
  resultadoTestes.innerHTML = "";
}

function atualizarOrientacao() {
  const largura = window.innerWidth;
  const altura = window.innerHeight;

  if (largura > altura) {
    orientacao.textContent = "Paisagem";
  } else {
    orientacao.textContent = "Retrato";
  }
}

async function verificarPermissao() {
  if (!navigator.permissions) {
    permissao.textContent = "API de permissões não disponível";
    return;
  }

  try {
    const resultado = await navigator.permissions.query({
      name: "camera"
    });

    permissao.textContent = resultado.state;

    resultado.onchange = function() {
      permissao.textContent = resultado.state;
    };

  } catch (erro) {
    permissao.textContent = "Não foi possível consultar";
  }
}

async function listarCameras() {
  if (!navigator.mediaDevices) {
    quantidadeCameras.textContent = "API indisponível";
    return;
  }

  try {
    const dispositivos =
      await navigator.mediaDevices.enumerateDevices();

    cameras = dispositivos.filter(function(dispositivo) {
      return dispositivo.kind === "videoinput";
    });

    quantidadeCameras.textContent = cameras.length;

    if (cameras.length === 0) {
      cameraAtual.textContent = "Nenhuma câmera encontrada";
    }

  } catch (erro) {
    quantidadeCameras.textContent = "Erro";
  }
}

function obterNomeCamera(faixa) {
  const configuracao = faixa.getSettings();

  if (configuracao.facingMode === "environment") {
    return "Câmera traseira";
  }

  if (configuracao.facingMode === "user") {
    return "Câmera frontal";
  }

  if (configuracao.deviceId) {

    const encontrada = cameras.find(function(camera) {
      return camera.deviceId === configuracao.deviceId;
    });

    if (encontrada && encontrada.label) {
      return encontrada.label;
    }
  }

  if (cameras[indiceCamera] && cameras[indiceCamera].label) {
    return cameras[indiceCamera].label;
  }

  return "Câmera " + (indiceCamera + 1);
}

function atualizarInformacoesCamera() {
  if (!streamAtual) {
    return;
  }

  const faixas = streamAtual.getVideoTracks();

  if (faixas.length === 0) {
    return;
  }

  const faixa = faixas[0];
  const configuracao = faixa.getSettings();

  cameraAtual.textContent = obterNomeCamera(faixa);

  if (configuracao.width && configuracao.height) {
    resolucao.textContent =
      configuracao.width +
      " × " +
      configuracao.height;
  } else {
    resolucao.textContent = "Desconhecida";
  }
}

function pararCamera() {
  if (streamAtual) {

    streamAtual.getTracks().forEach(function(track) {
      track.stop();
    });

    streamAtual = null;
  }

  video.srcObject = null;
  video.style.display = "none";
  placeholder.style.display = "flex";

  btnTrocar.disabled = true;
  btnFoto.disabled = true;
  btnParar.disabled = true;
  btnIniciar.disabled = false;

  cameraAtual.textContent = "Nenhuma";
  resolucao.textContent = "Nenhuma";

  atualizarStatus("Câmera desligada");

  verificarPermissao();
}

async function iniciarCamera(indice = 0) {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    atualizarStatus(
      "Este navegador não oferece acesso à câmera",
      "erro"
    );

    adicionarTeste(
      "❌ getUserMedia não está disponível.",
      "erro"
    );

    return;
  }

  if (streamAtual) {
    pararCamera();
  }

  try {

    limparTestes();

    adicionarTeste(
      "🟡 Solicitando acesso à câmera...",
      "aviso"
    );

    /*
      PRIMEIRA TENTATIVA:

      Não usamos deviceId.
      Não exigimos resolução específica.
      Não exigimos câmera frontal ou traseira.

      Isso evita OverconstrainedError em aparelhos
      que não aceitam determinadas configurações.
    */

    streamAtual =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

    const faixas =
      streamAtual.getVideoTracks();

    if (faixas.length === 0) {

      throw new Error(
        "Nenhuma faixa de vídeo foi criada."
      );
    }

    const faixa = faixas[0];

    const configuracao =
      faixa.getSettings();

    console.log(
      "Configuração da câmera:",
      configuracao
    );

    video.srcObject = streamAtual;

    video.style.display = "block";
    placeholder.style.display = "none";

    await video.play();

    /*
      Agora que a permissão foi concedida,
      podemos listar novamente as câmeras.
    */

    await listarCameras();

    if (cameras.length > 0) {
      indiceCamera =
        Math.min(
          indice,
          cameras.length - 1
        );
    }

    atualizarInformacoesCamera();

    atualizarStatus(
      "Câmera funcionando",
      "sucesso"
    );

    permissao.textContent = "granted";

    btnIniciar.disabled = true;
    btnTrocar.disabled = cameras.length < 2;
    btnFoto.disabled = false;
    btnParar.disabled = false;

    adicionarTeste(
      "✅ getUserMedia funcionando.",
      "sucesso"
    );

    adicionarTeste(
      "✅ Permissão para câmera concedida.",
      "sucesso"
    );

    adicionarTeste(
      "✅ Transmissão de vídeo iniciada.",
      "sucesso"
    );

    adicionarTeste(
      "✅ Configurações reais da câmera detectadas.",
      "sucesso"
    );

    if (
      configuracao.width &&
      configuracao.height
    ) {

      adicionarTeste(
        "📐 Resolução detectada: " +
        configuracao.width +
        " × " +
        configuracao.height,
        "sucesso"
      );
    }

    if (cameras.length >= 2) {

      adicionarTeste(
        "✅ Mais de uma câmera disponível.",
        "sucesso"
      );

    } else {

      adicionarTeste(
        "⚠️ O navegador informou apenas uma câmera.",
        "aviso"
      );
    }

  } catch (erro) {

    console.error(
      "Erro completo da câmera:",
      erro
    );

    if (streamAtual) {

      streamAtual.getTracks().forEach(
        function(track) {
          track.stop();
        }
      );

      streamAtual = null;
    }

    video.srcObject = null;
    video.style.display = "none";
    placeholder.style.display = "flex";

    btnIniciar.disabled = false;
    btnTrocar.disabled = true;
    btnFoto.disabled = true;
    btnParar.disabled = true;

    if (erro.name === "NotAllowedError") {

      atualizarStatus(
        "Permissão da câmera recusada",
        "erro"
      );

      permissao.textContent = "denied";

      adicionarTeste(
        "❌ O acesso à câmera foi recusado.",
        "erro"
      );

    } else if (erro.name === "NotFoundError") {

      atualizarStatus(
        "Câmera não encontrada",
        "erro"
      );

      adicionarTeste(
        "❌ Nenhuma câmera compatível foi encontrada.",
        "erro"
      );

    } else if (erro.name === "NotReadableError") {

      atualizarStatus(
        "Câmera ocupada ou indisponível",
        "erro"
      );

      adicionarTeste(
        "❌ A câmera não pôde ser utilizada.",
        "erro"
      );

    } else if (erro.name === "OverconstrainedError") {

      atualizarStatus(
        "Configuração de câmera não suportada",
        "erro"
      );

      adicionarTeste(
        "❌ O navegador recusou uma configuração da câmera.",
        "erro"
      );

      adicionarTeste(
        "🔬 OverconstrainedError detectado.",
        "erro"
      );

    } else if (erro.name === "SecurityError") {

      atualizarStatus(
        "Acesso bloqueado por segurança",
        "erro"
      );

      adicionarTeste(
        "❌ O navegador bloqueou o acesso por segurança.",
        "erro"
      );

    } else {

      atualizarStatus(
        "Erro ao iniciar câmera",
        "erro"
      );

      adicionarTeste(
        "❌ Erro: " +
        erro.name,
        "erro"
      );

      if (erro.message) {

        adicionarTeste(
          "ℹ️ " +
          erro.message,
          "aviso"
        );
      }
    }

    verificarPermissao();
  }
}

async function trocarCamera() {

  if (cameras.length < 2) {
    return;
  }

  const proxima =
    (indiceCamera + 1) %
    cameras.length;

  /*
    Para evitar problemas de deviceId,
    tentamos primeiro usar a câmera pelo
    deviceId somente depois que já temos
    permissão.
  */

  if (cameras[proxima]) {

    const cameraEscolhida =
      cameras[proxima];

    if (streamAtual) {

      streamAtual.getTracks().forEach(
        function(track) {
          track.stop();
        }
      );

      streamAtual = null;
    }

    try {

      const novoStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: {
              exact: cameraEscolhida.deviceId
            }
          },
          audio: false
        });

      streamAtual = novoStream;

      indiceCamera = proxima;

      video.srcObject = streamAtual;

      video.style.display = "block";
      placeholder.style.display = "none";

      await video.play();

      atualizarInformacoesCamera();

      atualizarStatus(
        "Câmera trocada",
        "sucesso"
      );

      adicionarTeste(
        "🔄 Câmera trocada com sucesso.",
        "sucesso"
      );

      return;

    } catch (erro) {

      console.warn(
        "Não foi possível selecionar diretamente a câmera:",
        erro
      );

      /*
        Se o deviceId não funcionar,
        tentamos uma alternativa usando
        facingMode.
      */

      try {

        const configuracaoAtual =
          streamAtual &&
          streamAtual.getVideoTracks().length
            ? streamAtual
                .getVideoTracks()[0]
                .getSettings()
            : {};

        let modo;

        if (
          configuracaoAtual.facingMode === "user"
        ) {
          modo = "environment";
        } else {
          modo = "user";
        }

        if (streamAtual) {

          streamAtual.getTracks().forEach(
            function(track) {
              track.stop();
            }
          );

          streamAtual = null;
        }

        streamAtual =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: modo
              }
            },
            audio: false
          });

        video.srcObject = streamAtual;

        video.style.display = "block";
        placeholder.style.display = "none";

        await video.play();

        atualizarInformacoesCamera();

        atualizarStatus(
          "Câmera trocada",
          "sucesso"
        );

        adicionarTeste(
          "🔄 Troca alternativa de câmera realizada.",
          "sucesso"
        );

      } catch (erroAlternativo) {

        atualizarStatus(
          "Não foi possível trocar a câmera",
          "erro"
        );

        adicionarTeste(
          "❌ A troca de câmera não foi aceita pelo dispositivo.",
          "erro"
        );

        console.error(
          erroAlternativo
        );
      }
    }
  }
}

function tirarFoto() {

  if (!streamAtual) {
    return;
  }

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {

    adicionarTeste(
      "❌ O vídeo ainda não está pronto.",
      "erro"
    );

    return;
  }

  canvas.width =
    video.videoWidth;

  canvas.height =
    video.videoHeight;

  const contexto =
    canvas.getContext("2d");

  contexto.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ultimaFoto =
    canvas.toDataURL(
      "image/jpeg",
      0.92
    );

  canvas.style.display = "block";

  btnBaixar.disabled = false;
  btnApagar.disabled = false;

  adicionarTeste(
    "📸 Foto capturada com sucesso.",
    "sucesso"
  );
}

function baixarFoto() {

  if (!ultimaFoto) {
    return;
  }

  const link =
    document.createElement("a");

  link.href = ultimaFoto;

  link.download =
    "foto-camera-015.jpg";

  document.body.appendChild(link);

  link.click();

  link.remove();

  adicionarTeste(
    "⬇️ Download da foto solicitado.",
    "sucesso"
  );
}

function apagarFoto() {

  ultimaFoto = null;

  const contexto =
    canvas.getContext("2d");

  contexto.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  canvas.style.display = "none";

  btnBaixar.disabled = true;
  btnApagar.disabled = true;

  adicionarTeste(
    "🗑️ Foto apagada da página.",
    "sucesso"
  );
}

btnIniciar.addEventListener(
  "click",
  function() {
    iniciarCamera(0);
  }
);

btnTrocar.addEventListener(
  "click",
  function() {
    trocarCamera();
  }
);

btnFoto.addEventListener(
  "click",
  function() {
    tirarFoto();
  }
);

btnParar.addEventListener(
  "click",
  function() {
    pararCamera();
  }
);

btnBaixar.addEventListener(
  "click",
  function() {
    baixarFoto();
  }
);

btnApagar.addEventListener(
  "click",
  function() {
    apagarFoto();
  }
);

if (
  navigator.mediaDevices &&
  navigator.mediaDevices.addEventListener
) {

  navigator.mediaDevices.addEventListener(
    "devicechange",
    async function() {

      await listarCameras();

      adicionarTeste(
        "🔄 Lista de dispositivos atualizada.",
        "aviso"
      );
    }
  );
}

window.addEventListener(
  "resize",
  atualizarOrientacao
);

window.addEventListener(
  "orientationchange",
  atualizarOrientacao
);

window.addEventListener(
  "beforeunload",
  function() {

    if (streamAtual) {

      streamAtual.getTracks().forEach(
        function(track) {
          track.stop();
        }
      );
    }
  }
);

async function iniciarLaboratorio() {

  atualizarOrientacao();

  await verificarPermissao();

  await listarCameras();

  if (!navigator.mediaDevices) {

    atualizarStatus(
      "MediaDevices não disponível",
      "erro"
    );

    adicionarTeste(
      "❌ navigator.mediaDevices não está disponível.",
      "erro"
    );

    return;
  }

  if (!navigator.mediaDevices.getUserMedia) {

    atualizarStatus(
      "getUserMedia não disponível",
      "erro"
    );

    adicionarTeste(
      "❌ getUserMedia não está disponível.",
      "erro"
    );

    return;
  }

  adicionarTeste(
    "🟢 API de câmera encontrada.",
    "sucesso"
  );

  adicionarTeste(
    "🟢 O navegador pode solicitar acesso à câmera.",
    "sucesso"
  );
}

iniciarLaboratorio();
