// script.js — frontend logic with Instagram fetch integration (deployed backend + simulation fallback)
const API_BASE = "https://socialreport-backend.onrender.com"; // <- config: replace with your backend URL if different

// Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const handleInput = document.getElementById('handle');
const profileName = document.getElementById('profileName');
const profileBio = document.getElementById('profileBio');
const profilePic = document.getElementById('profilePic');
const kpiEng = document.getElementById('kpi-eng');
const kpiFreq = document.getElementById('kpi-freq');
const kpiHour = document.getElementById('kpi-hour');
const kpiGrowth = document.getElementById('kpi-growth');
const scoreBadge = document.getElementById('scoreBadge');
const scoreText = document.getElementById('scoreText');
const scoreDesc = document.getElementById('scoreDesc');
const analysisText = document.getElementById('analysisText');
const recsWrap = document.getElementById('recs');
const summaryShort = document.getElementById('summaryShort');
const reportsCount = document.getElementById('reportsCount');
const downloadPdf = document.getElementById('downloadPdf');
const saveReport = document.getElementById('saveReport');

let chartEng, chartFormat;
let history = JSON.parse(localStorage.getItem('sr_history') || '[]');
reportsCount.innerText = history.length || 0;

function rnd(min, max){ return Math.round(Math.random()*(max-min)+min) }

// SIMULATION MODE
function simulateInstagram(username){
  const randomFollowers = rnd(1800, 120000);
  const randomPosts = rnd(18, 350);
  const bioExamples = [
    "Criador de conteúdo sobre lifestyle, negócios e criatividade.",
    "Apaixonado por tecnologia, marketing e inovação.",
    "Conteúdo sobre viagens, fotografia e redes sociais.",
    "Empreendedor digital • Dicas diárias de crescimento.",
    "Social Media • Ajudo perfis a crescer com estratégia e conteúdo."
  ];
  const fakeMedia = Array.from({length: 12}).map(() => ({
    likes: rnd(50, Math.max(120, Math.round(randomFollowers * 0.03))),
    comments: rnd(1, 40),
    tipo: ["Reel","Foto","Story","Vídeo"][rnd(0,3)]
  }));
  return {
    username,
    seguidores: randomFollowers,
    posts: randomPosts,
    biografia: bioExamples[rnd(0,bioExamples.length-1)],
    foto: "Images/avatar-demo.jpg",
    midias: fakeMedia
  };
}

// fetch Instagram with fallback to simulation
async function fetchInstagram(username){
  const clean = username.replace('@','').trim();
  try{
    const res = await fetch(`${API_BASE}/api/instagram/${clean}`, { method: 'GET' });
    if(res.ok){
      const data = await res.json();
      return data;
    } else {
      console.warn('Backend returned non-OK, using simulation');
      return simulateInstagram(clean);
    }
  } catch(err){
    console.warn('Backend offline, using simulation', err);
    return simulateInstagram(clean);
  }
}

// generate diagnosis from backend data
function generateDiagnosisFromData(data){
  const recent = data.midias || [];
  const followers = data.seguidores || 1000;
  const avgLikes = recent.slice(0,8).reduce((s,m)=>s+(m.likes||0),0) / Math.max(1, Math.min(8,recent.length));
  const engagement = (avgLikes / Math.max(1, followers)) * 100;
  const freqPerWeek = Math.min(7, Math.max(0, Math.round((data.posts || 0) / 4)));
  const bestHour = '18:00';
  const growthWeek = 1.2;
  const formatPerf = {"Reel":0.4,"Foto":0.3,"Vídeo (long)":0.2,"Stories":0.1};
  return {
    engagement: Number(engagement.toFixed(2)),
    freqPerWeek,
    bestHour,
    growthWeek,
    formatPerf,
    usesCTA: true,
    hasHashtags: true
  };
}

function generateDiagnosis(metrics){
  const {engagement, freqPerWeek, bestHour, growthWeek, formatPerf} = metrics;
  let strengths = [], weaknesses = [], recs = [];
  if(engagement >= 4.5) strengths.push("Alto engajamento médio — audiência interessada.");
  else if(engagement >= 2.5) strengths.push("Engajamento moderado — potencial para crescer.");
  else weaknesses.push("Engajamento baixo — conteúdo precisa ser mais cativante.");
  if(freqPerWeek >= 3) strengths.push("Boa frequência de postagens.");
  else { weaknesses.push("Frequência baixa — poste pelo menos 3x/semana."); recs.push("Aumentar para 3-4 publicações por semana."); }
  if(growthWeek > 1.5) strengths.push("Crescimento semanal saudável.");
  else { weaknesses.push("Crescimento lento — promover conteúdo de alcance (reels/shorts)."); recs.push("Criar 1 reel/short por semana focado em trends."); }
  const bestFormat = Object.keys(formatPerf).sort((a,b)=>formatPerf[b]-formatPerf[a])[0];
  recs.push("Priorize mais " + bestFormat + "s, pois eles têm melhor desempenho.");
  if(metrics.usesCTA) strengths.push("Uso de CTA nas legendas.");
  if(metrics.hasHashtags) recs.push("Otimize hashtags: combine 2-3 tags de alto alcance + 5-7 nichadas.");
  let score = Math.round((engagement*20) + Math.min(freqPerWeek,4)*10 + Math.min(growthWeek,3)*10 + (formatPerf[bestFormat]*15));
  score = Math.max(18, Math.min(98, score));
  let desc = score >= 75 ? "Excelente — continue e escale." : score >= 50 ? "Bom — tem espaço para melhorias." : "Precisa de melhorias — foco em frequência e formato.";
  return {strengths, weaknesses, recs, score, desc, bestFormat};
}

function renderCharts(metrics){
  const engCtx = document.getElementById('chartEng').getContext('2d');
  const fmtCtx = document.getElementById('chartFormat').getContext('2d');
  const labels = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const dataEng = labels.map(()=> rnd(Math.max(10,metrics.engagement*10-6), Math.max(15,metrics.engagement*10+12)));
  if(chartEng) chartEng.destroy();
  chartEng = new Chart(engCtx, {
    type:'line',
    data:{ labels, datasets:[{label:'Interações por dia', data:dataEng, tension:0.3, fill:true, borderWidth:2, pointRadius:2}]},
    options:{plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}}, y:{grid:{display:false}}}}
  });
  const formats = Object.keys(metrics.formatPerf);
  const vals = formats.map(k=> Math.round(metrics.formatPerf[k]*100));
  if(chartFormat) chartFormat.destroy();
  chartFormat = new Chart(fmtCtx, {
    type:'doughnut',
    data:{ labels:formats, datasets:[{ data:vals, borderWidth:0 }] },
    options:{ plugins:{ legend:{ position:'bottom' } } }
  });
}

async function analyzeHandleWithInstagram(handle){
  try{
    const data = await fetchInstagram(handle);
    profileName.innerText = '@' + (data.username || handle.replace('@',''));
    profileBio.innerText = `${data.seguidores || 0} seguidores • ${data.biografia || ''}`;
    profilePic.src = data.foto || 'Images/avatar-demo.jpg';
    const metrics = generateDiagnosisFromData(data);
    const diag = generateDiagnosis(metrics);
    kpiEng.innerText = metrics.engagement.toFixed(2) + '%';
    kpiFreq.innerText = metrics.freqPerWeek + 'x/sem';
    kpiHour.innerText = metrics.bestHour;
    kpiGrowth.innerText = metrics.growthWeek.toFixed(2) + '%';
    scoreBadge.innerText = diag.score;
    scoreText.innerText = diag.score + ' / 100';
    scoreDesc.innerText = diag.desc;
    let analysis = '';
    analysis += diag.strengths.length ? '<strong>Pontos fortes:</strong><ul>' + diag.strengths.map(s=>`<li>${s}</li>`).join('') + '</ul>' : '';
    analysis += diag.weaknesses.length ? '<strong>Pontos fracos:</strong><ul>' + diag.weaknesses.map(w=>`<li>${w}</li>`).join('') + '</ul>' : '';
    analysis += '<strong>Recomendações:</strong><ul>' + diag.recs.map(r=>`<li>${r}</li>`).join('') + '</ul>';
    analysisText.innerHTML = analysis;
    recsWrap.innerHTML = '';
    const recItems = [
      {title: "Frequência ideal", body: `Poste ${Math.max(3, Math.round(metrics.freqPerWeek || 3))}x por semana para manter alcance.`},
      {title: "Formato principal", body: `Priorize ${diag.bestFormat} e produza conteúdo entre 6 e 10 segundos.`},
      {title: "Hashtags & CTAs", body: `Use 7–10 hashtags relevantes e finalize com uma CTA clara.`}
    ];
    recItems.forEach(r=>{
      const div = document.createElement('div');
      div.className = 'rec';
      div.innerHTML = `<strong>${r.title}</strong><div style="margin-top:6px;color:var(--muted)">${r.body}</div>`;
      recsWrap.appendChild(div);
    });
    summaryShort.innerText = `Pontuação: ${diag.score} — ${diag.desc}`;
    renderCharts(metrics);
    const now = new Date().toISOString();
    history.unshift({handle, date:now, score:diag.score});
    if(history.length>50) history.pop();
    localStorage.setItem('sr_history', JSON.stringify(history));
    reportsCount.innerText = history.length;
  } catch(err){
    alert('Erro ao buscar dados do Instagram: ' + (err.message || err));
  }
}

analyzeBtn && analyzeBtn.addEventListener('click', ()=> {
  const handle = handleInput.value.trim() || '@demo_user';
  analyzeHandleWithInstagram(handle);
});

// PDF generator (extracts analysis text and rec cards)
async function generatePdfFromAnalysis(){
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;
  const maxWidth = pageWidth - margin*2;
  const lineHeight = 14;
  // header
  pdf.setFillColor(255,255,255);
  pdf.rect(0,0,pageWidth,820,'F');
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(18);
  pdf.text('Social Report — Relatório', margin, y);
  y += 28;
  // analysis text
  const analysisTextEl = document.getElementById('analysisText');
  const analise = analysisTextEl ? analysisTextEl.innerText : '';
  pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Análise automática', margin, y); y += 16;
  pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(analise || '—', maxWidth);
  pdf.text(lines, margin, y); y += lines.length * lineHeight + 10;
  // rec cards
  const recCards = Array.from(document.querySelectorAll('.rec'));
  for(const card of recCards){
    const title = card.querySelector('strong')?.innerText || '';
    const body = card.innerText.replace(title,'').trim();
    pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text(title, margin, y); y += 16;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
    const blines = pdf.splitTextToSize(body || '—', maxWidth);
    pdf.text(blines, margin, y); y += blines.length * lineHeight + 10;
    if(y > 740){ pdf.addPage(); y = 50; }
  }
  // footer
  const pageCount = pdf.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    pdf.setPage(i);
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Gerado por Social Report — Página ${i} de ${pageCount}`, pageWidth/2 - 80, pdf.internal.pageSize.getHeight() - 30);
  }
  pdf.save('relatorio-social-report.pdf');
}
downloadPdf && downloadPdf.addEventListener('click', async (e)=>{
  e.preventDefault();
  try{
    await generatePdfFromAnalysis();
  } catch(err){
    alert('Erro ao gerar PDF: ' + (err.message || err));
  }
});
