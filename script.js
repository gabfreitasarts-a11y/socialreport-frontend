// ===========================================
// CONFIG
// ===========================================
const API_BASE = "https://socialreport-backend.onrender.com"; 
// Se estiver testando localmente, troque por: "http://localhost:3000"


// ===========================================
// ELEMENTOS
// ===========================================
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

let chartEng, chartFormat;
let history = JSON.parse(localStorage.getItem('sr_history') || '[]');
reportsCount.innerText = history.length || 0;

function rnd(min, max){ return Math.round(Math.random()*(max-min)+min) }


// ===========================================
// 🔍 SUPORTE A LINKS DE INSTAGRAM
// ===========================================
function extractUsername(input) {
    input = input.trim();

    // Caso digite @usuario
    if (input.startsWith("@")) {
        return input.replace("@", "").trim();
    }

    // Caso cole um link do Instagram
    const urlPattern = /instagram\.com\/([^\/\?\&]+)/i;
    const match = input.match(urlPattern);

    if (match && match[1]) {
        return match[1].trim();
    }

    // Caso digite só o nome
    return input.replace("@", "").trim();
}



// ===========================================
// SIMULAÇÃO (fallback)
// ===========================================
function simulateInstagram(username){
    const randomFollowers = rnd(1800, 120000);
    const randomPosts = rnd(18, 350);

    const bios = [
        "Criador de conteúdo sobre lifestyle, negócios e criatividade.",
        "Apaixonado por tecnologia, marketing e inovação.",
        "Fotografia, viagens e social media.",
        "Dicas diárias de Marketing Digital.",
        "Crescimento orgânico e estratégia de conteúdo."
    ];

    const fakeMedia = Array.from({length: 12}).map(() => ({
        likes: rnd(30, randomFollowers * 0.03),
        comments: rnd(1, 40),
        tipo: ["Reel","Foto","Story","Vídeo"][rnd(0,3)]
    }));

    return {
        username,
        seguidores: randomFollowers,
        posts: randomPosts,
        biografia: bios[rnd(0,bios.length-1)],
        foto: "Images/avatar-demo.jpg",
        midias: fakeMedia
    };
}



// ===========================================
// BUSCA NO BACKEND COM FALLBACK PARA SIMULADO
// ===========================================
async function fetchInstagram(username){
    const clean = extractUsername(username);

    try{
        const res = await fetch(`${API_BASE}/api/instagram/${clean}`);

        if (res.ok) {
            return await res.json();
        }

        console.warn("Backend retornou erro. Modo SIMULADO ativado.");
        return simulateInstagram(clean);

    } catch(err){
        console.warn("Backend offline. Modo SIMULADO ativado.");
        return simulateInstagram(clean);
    }
}



// ===========================================
// ANÁLISE E DIAGNÓSTICO
// ===========================================
function generateDiagnosisFromData(data){
    const recent = data.midias || [];
    const followers = data.seguidores || 1000;

    const avgLikes = recent.slice(0,8).reduce((s,m)=>s+(m.likes||0),0) 
                        / Math.max(1, Math.min(8,recent.length));

    const engagement = (avgLikes / followers) * 100;

    return {
        engagement: Number(engagement.toFixed(2)),
        freqPerWeek: Math.round((data.posts||0) / 4),
        bestHour: "18:00",
        growthWeek: 1.2,
        formatPerf: { Reel:0.4, Foto:0.3, "Vídeo (long)":0.2, Stories:0.1 },
        usesCTA: true,
        hasHashtags: true
    };
}


function generateDiagnosis(metrics){
    const { engagement, freqPerWeek, growthWeek, formatPerf } = metrics;

    let strengths = [], weaknesses = [], recs = [];

    if(engagement >= 4.5) strengths.push("Alto engajamento médio — audiência interessada.");
    else if(engagement >= 2.5) strengths.push("Engajamento moderado — potencial para crescer.");
    else weaknesses.push("Engajamento baixo — melhore conteúdos visuais e CTAs.");

    if(freqPerWeek >= 3) strengths.push("Boa frequência de postagens.");
    else { weaknesses.push("Frequência baixa."); recs.push("Poste 3–4x por semana."); }

    if(growthWeek > 1.5) strengths.push("Crescimento saudável.");
    else { weaknesses.push("Crescimento lento."); recs.push("Criar Reels semanais com tendências."); }

    const bestFormat = Object.keys(formatPerf).sort((a,b)=>formatPerf[b]-formatPerf[a])[0];
    recs.push("Priorize mais " + bestFormat + "s.");

    if(metrics.hasHashtags) recs.push("Use 7–10 hashtags relevantes.");

    let score = Math.round(
        engagement*20 +
        Math.min(freqPerWeek,4)*10 +
        Math.min(growthWeek,3)*10 +
        formatPerf[bestFormat]*15
    );

    score = Math.max(18, Math.min(98, score));

    return {
        strengths, weaknesses, recs, score,
        desc: score >= 75 ? "Excelente" : score >= 50 ? "Bom" : "Precisa melhorar",
        bestFormat
    };
}



// ===========================================
// GRÁFICOS
// ===========================================
function renderCharts(metrics){
    const engCtx = document.getElementById('chartEng').getContext('2d');
    const fmtCtx = document.getElementById('chartFormat').getContext('2d');

    if(chartEng) chartEng.destroy();
    if(chartFormat) chartFormat.destroy();

    chartEng = new Chart(engCtx, {
        type:'line',
        data:{
            labels:["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],
            datasets:[{
                data:[rnd(20,50),rnd(30,60),rnd(25,55),rnd(20,50),rnd(35,62),rnd(40,70),rnd(22,55)],
                tension:0.3,
                borderWidth:2,
                fill:true
            }]
        },
        options:{ plugins:{legend:{display:false}} }
    });

    chartFormat = new Chart(fmtCtx, {
        type:'doughnut',
        data:{
            labels:Object.keys(metrics.formatPerf),
            datasets:[{
                data:Object.values(metrics.formatPerf).map(v=>Math.round(v*100)),
                borderWidth:0
            }]
        },
        options:{ plugins:{legend:{position:"bottom"}} }
    });
}



// ===========================================
// PROCESSO PRINCIPAL
// ===========================================
async function analyzeHandleWithInstagram(handle){
    const data = await fetchInstagram(handle);

    profileName.innerText = "@" + data.username;
    profileBio.innerText = `${data.seguidores} seguidores • ${data.biografia}`;
    profilePic.src = data.foto || "Images/avatar-demo.jpg";

    const metrics = generateDiagnosisFromData(data);
    const diag = generateDiagnosis(metrics);

    kpiEng.innerText = metrics.engagement + "%";
    kpiFreq.innerText = metrics.freqPerWeek + "x/sem";
    kpiHour.innerText = metrics.bestHour;
    kpiGrowth.innerText = metrics.growthWeek + "%";

    scoreBadge.innerText = diag.score;
    scoreText.innerText = diag.score + " / 100";
    scoreDesc.innerText = diag.desc;

    let html = "";
    html += "<strong>Pontos fortes:</strong><ul>" + diag.strengths.map(s=>`<li>${s}</li>`).join("") + "</ul>";
    html += "<strong>Pontos fracos:</strong><ul>" + diag.weaknesses.map(s=>`<li>${s}</li>`).join("") + "</ul>";
    html += "<strong>Recomendações:</strong><ul>" + diag.recs.map(s=>`<li>${s}</li>`).join("") + "</ul>";

    analysisText.innerHTML = html;

    recsWrap.innerHTML = "";
    [
        {title:"Frequência ideal", body:`Poste ${Math.max(3, metrics.freqPerWeek)}x por semana.`},
        {title:"Formato principal", body:`Priorize ${diag.bestFormat}s.`},
        {title:"Hashtags & CTAs", body:`Use 7–10 hashtags relevantes e finalize com CTA.`}
    ].forEach(r=>{
        const div=document.createElement("div");
        div.className="rec";
        div.innerHTML=`<strong>${r.title}</strong><div>${r.body}</div>`;
        recsWrap.appendChild(div);
    });

    summaryShort.innerText = `Pontuação: ${diag.score} — ${diag.desc}`;

    renderCharts(metrics);

    history.unshift({handle,date:new Date().toISOString(),score:diag.score});
    localStorage.setItem('sr_history', JSON.stringify(history));
    reportsCount.innerText = history.length;
}



// ===========================================
// BOTÃO ANALISAR
// ===========================================
analyzeBtn.addEventListener("click", () => {
    const raw = handleInput.value.trim();
    const username = extractUsername(raw);

    if(!username){
        alert("Digite um @ ou cole o link do perfil.");
        return;
    }

    analyzeHandleWithInstagram(username);
});



// ===========================================
// PDF
// ===========================================
downloadPdf.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Relatório Social Report", 20, 20);

    pdf.setFontSize(12);
    pdf.text(analysisText.innerText, 20, 50, {maxWidth:170});

    pdf.save("relatorio-social-report.pdf");
});
