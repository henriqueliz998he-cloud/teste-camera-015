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
    const dispositivos = await navigator.mediaDevices.enumerateDevices();

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

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

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

    await listarCameras();

    if (cameras.length === 0) {

      atualizarStatus(
        "Nenhuma câmera encontrada",
        "erro"
      );

      adicionarTeste(
        "❌ Nenhuma câmera de vídeo foi encontrada.",
        "erro"
      );

      return;
    }

    indiceCamera = indice % cameras.length;

    const cameraEscolhida = cameras[indiceCamera];

    const constraints = {
      video: {
        deviceId: {
          exact: cameraEscolhida.deviceId
        },
        width: {
          ideal: 1920
        },
        height: {
          ideal: 1080
        }
      },
      audio: false
    };

    streamAtual = await navigator.mediaDevices.getUserMedia(
      constraints
    );

    video.srcObject = streamAtual;

    video.style.display = "block";
    placeholder.style.display = "none";

    await video.play();

    const faixa = streamAtual.getVideoTracks()[0];

    const configuracao = faixa.getSettings();

    let nomeCamera = cameraEscolhida.label;

    if (!nomeCamera) {
      nomeCamera = "Câmera " + (indiceCamera + 1);
    }

    cameraAtual.textContent = nomeCamera;

    if (configuracao.width && configuracao.height) {
      resolucao.textContent =
        configuracao.width +
        " × " +
        configuracao.height;
    } else {
      resolucao.textContent = "Desconhecida";
    }

    atualizarStatus(
      "Câmera funcionando",
      "sucesso"
    );

    permissao.textContent = "granted";

    btnIniciar.disabled = true;
    btnTrocar.disabled = cameras.length < 2;
    btnFoto.disabled = false;
    btnParar.disabled = false;

    limparTestes();

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
      "✅ Configurações da câmera detectadas.",
      "sucesso"
    );

    if (cameras.length >= 2) {
      adicionarTeste(
        "✅ Mais de uma câmera disponível.",
        "sucesso"
      );
    } else {
      adicionarTeste(
        "⚠️ Apenas uma câmera disponível.",
        "aviso"
      );
    }

    await listarCameras();

  } catch (erro) {

    console.error(erro);

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
        "❌ Erro: " + erro.name,
        "erro"
      );
    }

    verificarPermissao();
  }
}

function trocarCamera() {

  if (cameras.length < 2) {
    return;
  }

  const proxima =
    (indiceCamera + 1) % cameras.length;

  iniciarCamera(proxima);
}

function tirarFoto() {

  if (!streamAtual) {
    return;
  }

  if (!video.videoWidth || !video.videoHeight) {
    adicionarTeste(
      "❌ O vídeo ainda não está pronto.",
      "erro"
    );

    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const contexto = canvas.getContext("2d");

  contexto.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ultimaFoto = canvas.toDataURL(
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

  const link = document.createElement("a");

  link.href = ultimaFoto;
  link.download = "foto-camera-015.jpg";

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

  const contexto = canvas.getContext("2d");

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
    iniciarCamera(indiceCamera);
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
