// pay.js - payment demo with PIX key and simulation
const pixKey = '14982098075';
const qrCanvas = document.getElementById('qrCanvas');
const pixKeyText = document.getElementById('pixKeyText');
if(pixKeyText) pixKeyText.innerText = pixKey;

const emv = "00020126360014BR.GOV.BCB.PIX0114+55" + pixKey + "52040000530398654051.005802BR5925SOCIAL REPORT PLATAFORMA6009SAO PAULO62070503***6304";
if(window.QRCode && qrCanvas){
  QRCode.toCanvas(qrCanvas, emv, { width: 240 }, function (error) {
    if (error) {
      QRCode.toCanvas(qrCanvas, pixKey, { width: 240 });
    }
  });
}

const copyBtn = document.getElementById('copyPix');
copyBtn && copyBtn.addEventListener('click', ()=>{
  navigator.clipboard.writeText(pixKey).then(()=> alert('Chave PIX copiada: ' + pixKey)).catch(()=> alert('Não foi possível copiar automaticamente. Copie manualmente: ' + pixKey));
});

const btnJa = document.getElementById('btnJaPaguei');
btnJa && btnJa.addEventListener('click', ()=>{
  localStorage.setItem('sr_paid_demo','true');
  const cur = parseInt(localStorage.getItem('sr_analyses_left') || '0', 10);
  localStorage.setItem('sr_analyses_left', (cur + 1).toString());
  alert('Pagamento simulado confirmado (demo). 1 análise liberada. Você será redirecionado ao dashboard.');
  window.location.href = 'index.html';
});
