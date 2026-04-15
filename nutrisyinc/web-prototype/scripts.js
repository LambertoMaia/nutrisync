const pageMap = {
  's-home': '/',
  's-cadastro': '/cadastro',
  's-login': '/login',
  's-home-user': '/home-user',
  's-enviar-receita': '/enviar-receita',
  's-cozinheiros': '/cozinheiros',
  's-confirmar': '/confirmar',
  's-status': '/status',
  's-painel-cook': '/painel-cozinheiro',
  's-pedidos': '/meus-pedidos',
  's-avaliacao': '/avaliacao',
  's-perfil': '/perfil',
  's-sem-receita': '/cardapios'
};

function go(id){
  const page = pageMap[id];
  if(page) {
    window.location.href = page;
  } else {
    // Local section toggle if ID doesn't match a page
    const el = document.getElementById(id);
    if(el) {
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      el.classList.add('active');
      el.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }
  if(document.getElementById('dmenu')) {
    document.getElementById('dmenu').classList.remove('open');
  }
}

function nav(id){ go(id); }

function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }

function selTipo(t){
  const elU = document.getElementById('tp-u');
  const elC = document.getElementById('tp-c');
  if(elU && elC) {
    elU.style.border = t === 'u' ? '2px solid var(--green)' : '2px solid var(--beige-mid)';
    elU.style.background = t === 'u' ? 'var(--green-l)' : 'var(--white)';
    elC.style.border = t === 'c' ? '2px solid var(--green)' : '2px solid var(--beige-mid)';
    elC.style.background = t === 'c' ? 'var(--green-l)' : 'var(--white)';
  }
  const secU = document.getElementById('sec-cliente');
  const secC = document.getElementById('sec-cozinheiro');
  if(secU) secU.style.display = t === 'u' ? 'block' : 'none';
  if(secC) secC.style.display = t === 'c' ? 'block' : 'none';
}

function selLogin(t){
  const elU = document.getElementById('lt-u');
  const elC = document.getElementById('lt-c');
  if(elU && elC) {
    const su = {borderColor:'var(--green)',background:'var(--green-l)'};
    const su2 = {borderColor:'var(--beige-mid)',background:'var(--white)'};
    Object.assign(elU.style, t === 'u' ? su : su2);
    Object.assign(elC.style, t === 'c' ? su : su2);
  }
}

function selOp(t){
  const opFoto = document.getElementById('op-foto');
  const opForm = document.getElementById('op-form');
  const areaFoto = document.getElementById('area-foto');
  const areaForm = document.getElementById('area-form');
  
  if(opFoto) opFoto.style.borderColor = t === 'foto' ? 'var(--green)' : 'var(--beige-mid)';
  if(opFoto) opFoto.style.background = t === 'foto' ? 'var(--green-l)' : 'var(--white)';
  if(opForm) opForm.style.borderColor = t === 'form' ? 'var(--green)' : 'var(--beige-mid)';
  if(opForm) opForm.style.background = t === 'form' ? 'var(--green-l)' : 'var(--white)';
  
  if(areaFoto) areaFoto.style.display = t === 'foto' ? 'block' : 'none';
  if(areaForm) areaForm.style.display = t === 'form' ? 'block' : 'none';
}

function setStar(n){
  const stars = document.querySelectorAll('#stars span');
  stars.forEach((s, i) => {
    s.style.filter = i < n ? 'none' : 'grayscale(1)';
  });
}