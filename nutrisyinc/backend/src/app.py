from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from datetime import datetime, timedelta
import sys
import os
import requests
from werkzeug.security import generate_password_hash, check_password_hash
import re
from decimal import Decimal
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from views.models import Cozinheiro, Cliente, Pedido, Especialidade, Proposta, Marmita

app = Flask(__name__, 
            template_folder='../../web-prototype',
            static_folder='../../web-prototype')

# Configuração da sessão
app.secret_key = 'senha-muito-forte-nutrilho-1234'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_COOKIE_SECURE'] = False  # Mude para True em produção com HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

CORS(app, supports_credentials=True)

# Criar tabelas se não existirem
Base.metadata.create_all(bind=engine)

# ============ FUNÇÕES DE VALIDAÇÃO ============

def validar_email(db, email, tipo_usuario=None, id_atual=None):
    """Valida formato do email e verifica se já existe"""
    if not email:
        return False, "E-mail é obrigatório"
    
    # Valida formato
    padrao_email = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(padrao_email, email):
        return False, "E-mail inválido. Use um formato como usuario@exemplo.com"
    
    # Verifica se já existe (em ambas as tabelas)
    if tipo_usuario == 'cozinheiro':
        existente = db.query(Cozinheiro).filter(Cozinheiro.email == email)
        if id_atual:
            existente = existente.filter(Cozinheiro.id != id_atual)
        if existente.first():
            return False, "Este e-mail já está cadastrado como cozinheiro"
    else:
        existente = db.query(Cliente).filter(Cliente.email == email)
        if id_atual:
            existente = existente.filter(Cliente.id != id_atual)
        if existente.first():
            return False, "Este e-mail já está cadastrado"
    
    return True, email

def validar_telefone(db, telefone, tipo_usuario=None, id_atual=None):
    """Valida formato do telefone e verifica se já existe"""
    if not telefone:
        return False, "Telefone é obrigatório"
    
    # Remove formatação
    telefone_limpo = re.sub(r'\D', '', telefone)
    
    # Verifica tamanho
    if len(telefone_limpo) < 10 or len(telefone_limpo) > 11:
        return False, "Telefone inválido. Use um número com 10 ou 11 dígitos (incluindo DDD)"
    
    # Verifica formato de celular com 11 dígitos
    if len(telefone_limpo) == 11 and telefone_limpo[2] != '9':
        return False, "Celular com 11 dígitos deve começar com 9 após o DDD"
    
    # Verifica se já existe
    if tipo_usuario == 'cozinheiro':
        existente = db.query(Cozinheiro).filter(Cozinheiro.telefone == telefone_limpo)
        if id_atual:
            existente = existente.filter(Cozinheiro.id != id_atual)
        if existente.first():
            return False, "Este telefone já está cadastrado"
    else:
        existente = db.query(Cliente).filter(Cliente.telefone == telefone_limpo)
        if id_atual:
            existente = existente.filter(Cliente.id != id_atual)
        if existente.first():
            return False, "Este telefone já está cadastrado"
    
    return True, telefone_limpo

def validar_senha(senha, confirmar_senha=None):
    """Valida força da senha"""
    if not senha:
        return False, "Senha é obrigatória"
    
    if confirmar_senha is not None and senha != confirmar_senha:
        return False, "As senhas não conferem"
    
    if len(senha) < 6:
        return False, "A senha deve ter no mínimo 6 caracteres"
    
    if len(senha) > 50:
        return False, "A senha deve ter no máximo 50 caracteres"
    
    if not re.search(r'[A-Z]', senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula"
    
    if not re.search(r'[a-z]', senha):
        return False, "A senha deve conter pelo menos uma letra minúscula"
    
    if not re.search(r'[0-9]', senha):
        return False, "A senha deve conter pelo menos um número"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', senha):
        return False, "A senha deve conter pelo menos um caractere especial (!@#$%^&* etc.)"
    
    return True, generate_password_hash(senha)

# ============ ROTAS DAS PÁGINAS HTML ============

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/cadastro')
def cadastro():
    return render_template('cadastro.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/home-user')
def home_user():
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cliente':
        return redirect('/login')
    return render_template('home-user.html')

@app.route('/enviar-receita')
def enviar_receita():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('enviar-receita.html')

@app.route('/cozinheiros')
def cozinheiros_page():
    return render_template('cozinheiros.html')

@app.route('/confirmar')
def confirmar():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('confirmar.html')

@app.route('/status')
def status_page():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('status.html')

@app.route('/meus-pedidos')
def meus_pedidos():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('meus-pedidos.html')

@app.route('/avaliacao')
def avaliacao():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('avaliacao.html')

@app.route('/perfil')
def perfil():
    if 'usuario_id' not in session:
        return redirect('/login')
    return render_template('perfil.html')

@app.route('/cardapios')
def cardapios():
    return render_template('cardapios.html')

@app.route('/painel-cozinheiro')
def painel_cozinheiro():
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cozinheiro':
        return redirect('/login')
    return render_template('painel-cozinheiro.html')

# ============ API: BUSCAR CEP ============
@app.route('/api/buscar-cep', methods=['POST'])
def buscar_cep():
    """Consulta a API ViaCEP para obter endereço completo"""
    try:
        cep = request.form.get('cep', '').replace('-', '').strip()
        
        if not cep or not cep.isdigit() or len(cep) != 8:
            return jsonify({'success': False, 'error': 'CEP inválido. Digite 8 números.'}), 400
        
        response = requests.get(f'https://viacep.com.br/ws/{cep}/json/', timeout=5)
        response.raise_for_status()
        
        endereco = response.json()
        
        if 'erro' in endereco:
            return jsonify({'success': False, 'error': 'CEP não encontrado.'}), 404
        
        return jsonify({
            'success': True,
            'logradouro': endereco.get('logradouro', ''),
            'bairro': endereco.get('bairro', ''),
            'cidade': endereco.get('localidade', ''),
            'uf': endereco.get('uf', ''),
            'cep': endereco.get('cep', '')
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'A consulta demorou muito. Tente novamente.'}), 504
    except Exception as e:
        print(f"Erro ao buscar CEP: {e}")
        return jsonify({'success': False, 'error': 'Erro ao consultar o CEP.'}), 500

# ============ ROTA DE CADASTRO (via POST de formulário) ============
@app.route('/cadastro', methods=['POST'])
def processar_cadastro():
    """Processa o cadastro vindo do formulário HTML"""
    tipo = request.form.get('tipo_cadastro', 'cliente')
    
    if tipo == 'cliente':
        return cadastrar_cliente_form()
    else:
        return cadastrar_cozinheiro_form()

def cadastrar_cliente_form():
    """Cadastra um novo cliente via formulário HTML"""
    db = SessionLocal()
    try:
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip()
        telefone = request.form.get('telefone', '').strip()
        senha = request.form.get('senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')
        
        cep = request.form.get('cep', '').strip()
        logradouro = request.form.get('logradouro', '').strip()
        numero = request.form.get('numero', '0').strip()
        complemento = request.form.get('complemento', '').strip()
        restricao = request.form.get('restricao', '')
        
        # Validações
        valido, email_valido = validar_email(db, email)
        if not valido:
            return render_template('cadastro.html', erro=email_valido)
        
        valido, telefone_valido = validar_telefone(db, telefone)
        if not valido:
            return render_template('cadastro.html', erro=telefone_valido)
        
        valido, senha_hash = validar_senha(senha, confirmar_senha)
        if not valido:
            return render_template('cadastro.html', erro=senha_hash)
        
        # Criar cliente
        novo_cliente = Cliente(
            nome=nome,
            email=email_valido,
            telefone=telefone_valido,
            senha=senha_hash,
            cep=cep,
            rua=logradouro,
            numero=int(numero) if numero.isdigit() else 0,
            complemento=complemento,
            restricao=restricao
        )
            
        db.add(novo_cliente)
        db.commit()
        db.refresh(novo_cliente)
        
        session['usuario_id'] = novo_cliente.id
        session['usuario_tipo'] = 'cliente'
        session['usuario_nome'] = novo_cliente.nome
        session['usuario_email'] = novo_cliente.email
        
        return redirect(url_for('home_user'))
        
    except Exception as e:
        db.rollback()
        print(f"Erro no cadastro de cliente: {e}")
        import traceback
        traceback.print_exc()
        return render_template('cadastro.html', erro=f"Erro ao cadastrar: {str(e)}")
    finally:
        db.close()

def cadastrar_cozinheiro_form():
    """Cadastra um novo cozinheiro via formulário HTML"""
    db = SessionLocal()
    try:
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip()
        telefone = request.form.get('telefone', '').strip()
        senha = request.form.get('senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')
        
        cep = request.form.get('cep', '').strip()
        logradouro = request.form.get('logradouro', '').strip()
        numero = request.form.get('numero', '0').strip()
        complemento = request.form.get('complemento', '').strip()
        
        especialidades = request.form.getlist('especialidades')
        sobre_voce = request.form.get('sobre_voce', '')
        
        # Novos campos
        foto_link = request.form.get('foto_link', '').strip()
        tipo_entrega = request.form.get('tipo_entrega', '').strip()
        
        # Validações
        valido, email_valido = validar_email(db, email, 'cozinheiro')
        if not valido:
            return render_template('cadastro.html', erro=email_valido)
        
        valido, telefone_valido = validar_telefone(db, telefone, 'cozinheiro')
        if not valido:
            return render_template('cadastro.html', erro=telefone_valido)
        
        valido, senha_hash = validar_senha(senha, confirmar_senha)
        if not valido:
            return render_template('cadastro.html', erro=senha_hash)
        
        # Validação do tipo_entrega (opcional, mas recomendado)
        tipos_entrega_validos = ['delivery', 'retirada', 'ambos']
        if tipo_entrega and tipo_entrega not in tipos_entrega_validos:
            return render_template('cadastro.html', erro="Tipo de entrega inválido")
        
        # Criar/obter especialidade
        especialidade_nome = especialidades[0] if especialidades else 'Geral'
        especialidade = db.query(Especialidade).filter(Especialidade.nome == especialidade_nome).first()
        if not especialidade:
            especialidade = Especialidade(nome=especialidade_nome)
            db.add(especialidade)
            db.commit()
            db.refresh(especialidade)
        
        # Criar novo cozinheiro com todos os campos
        novo_cozinheiro = Cozinheiro(
            nome=nome,
            email=email_valido,
            telefone=telefone_valido,
            senha=senha_hash,
            rua=logradouro,
            cep=cep,
            complemento=complemento,
            numero=int(numero) if numero.isdigit() else 0,
            especialidade_id=especialidade.id,
            sobre_voce=sobre_voce,
            foto_link=foto_link if foto_link else None,  # Se não for fornecido, fica None
            tipo_entrega=tipo_entrega if tipo_entrega else None,  # Se não for fornecido, fica None
            avaliacao=0  # Valor padrão
        )
        
        db.add(novo_cozinheiro)
        db.commit()
        db.refresh(novo_cozinheiro)
        
        session['usuario_id'] = novo_cozinheiro.id
        session['usuario_tipo'] = 'cozinheiro'
        session['usuario_nome'] = novo_cozinheiro.nome
        session['usuario_email'] = novo_cozinheiro.email
        
        return redirect(url_for('painel_cozinheiro'))
        
    except Exception as e:
        db.rollback()
        print(f"Erro no cadastro de cozinheiro: {e}")
        import traceback
        traceback.print_exc()
        return render_template('cadastro.html', erro=f"Erro ao cadastrar: {str(e)}")
    finally:
        db.close()
# ============ API: LOGIN ============
@app.route('/api/login', methods=['POST'])
def login():
    """Faz login de cliente ou cozinheiro"""
    db = SessionLocal()
    try:
        data = request.json
        email = data.get('email')
        senha = data.get('senha')
        tipo = data.get('tipo', 'cliente')
        
        if not email or not senha:
            return jsonify({'success': False, 'error': 'Preencha email e senha'}), 400
        
        if tipo == 'cliente':
            usuario = db.query(Cliente).filter(Cliente.email == email).first()
            if not usuario or not check_password_hash(usuario.senha, senha):
                return jsonify({'success': False, 'error': 'Email ou senha incorretos'}), 401
            
            session['usuario_id'] = usuario.id
            session['usuario_tipo'] = 'cliente'
            session['usuario_nome'] = usuario.nome
            session['usuario_email'] = usuario.email
            
            return jsonify({
                'success': True,
                'message': 'Login realizado com sucesso!',
                'redirect': '/home-user'
            })
            
        elif tipo == 'cozinheiro':
            usuario = db.query(Cozinheiro).filter(Cozinheiro.email == email).first()
            if not usuario or not check_password_hash(usuario.senha, senha):
                return jsonify({'success': False, 'error': 'Email ou senha incorretos'}), 401
            
            session['usuario_id'] = usuario.id
            session['usuario_tipo'] = 'cozinheiro'
            session['usuario_nome'] = usuario.nome
            session['usuario_email'] = usuario.email
            
            return jsonify({
                'success': True,
                'message': 'Login realizado com sucesso!',
                'redirect': '/painel-cozinheiro'
            })
            
    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

# ============ API: VERIFICAR LOGIN ============
@app.route('/api/verificar-login', methods=['GET'])
def verificar_login():
    """Verifica se o usuário está logado"""
    if 'usuario_id' in session:
        return jsonify({
            'logado': True,
            'usuario_id': session['usuario_id'],
            'usuario_tipo': session['usuario_tipo'],
            'usuario_nome': session['usuario_nome']
        })
    return jsonify({'logado': False})

# ============ API: LOGOUT ============
@app.route('/api/logout', methods=['POST'])
def logout():
    """Faz logout do usuário"""
    session.clear()
    return jsonify({'success': True, 'redirect': '/'})

# ============ API: LISTAR COZINHEIROS ============
@app.route('/api/cozinheiros', methods=['GET'])
def listar_cozinheiros():
    """Retorna lista de cozinheiros para o marketplace"""
    db = SessionLocal()
    try:
        especialidade_filtro = request.args.get('especialidade')
        
        query = db.query(Cozinheiro)
        if especialidade_filtro:
            query = query.join(Especialidade).filter(Especialidade.nome == especialidade_filtro)
        
        cozinheiros = query.all()
        
        resultado = []
        for c in cozinheiros:
            # Calcular média de avaliações
            from sqlalchemy import func
            media_avaliacoes = db.query(func.avg(Pedido.avaliacao)).filter(
                Pedido.cozinheiro_id == c.id,
                Pedido.avaliacao > 0
            ).scalar() or 0
            
            resultado.append({
                'id': c.id,
                'nome': c.nome,
                'avaliacao': float(media_avaliacoes),
                'especialidade': c.especialidade.nome if c.especialidade else None,
                'localizacao': c.cep,
                'rua': c.rua,
                'sobre': c.sobre_voce,
                'foto': c.foto_link,
                'telefone': c.telefone,
                'tipo_entrega': c.tipo_entrega
            })
        
        return jsonify(resultado)
    finally:
        db.close()

# ============ API: DETALHES DO COZINHEIRO ============
@app.route('/api/cozinheiros/<int:cozinheiro_id>', methods=['GET'])
def detalhes_cozinheiro(cozinheiro_id):
    """Retorna detalhes de um cozinheiro específico"""
    db = SessionLocal()
    try:
        cozinheiro = db.query(Cozinheiro).filter(Cozinheiro.id == cozinheiro_id).first()
        if not cozinheiro:
            return jsonify({'error': 'Cozinheiro não encontrado'}), 404
        
        from sqlalchemy import func
        media_avaliacoes = db.query(func.avg(Pedido.avaliacao)).filter(
            Pedido.cozinheiro_id == cozinheiro_id,
            Pedido.avaliacao > 0
        ).scalar() or 0
        
        marmitas = db.query(Marmita).filter(Marmita.cozinheiro_id == cozinheiro_id).all()
        
        return jsonify({
            'id': cozinheiro.id,
            'nome': cozinheiro.nome,
            'avaliacao': float(media_avaliacoes),
            'especialidade': cozinheiro.especialidade.nome if cozinheiro.especialidade else None,
            'localizacao': cozinheiro.cep,
            'rua': cozinheiro.rua,
            'sobre': cozinheiro.sobre_voce,
            'foto': cozinheiro.foto_link,
            'telefone': cozinheiro.telefone,
            'tipo_entrega': cozinheiro.tipo_entrega,
            'marmitas': [{
                'id': m.id,
                'nome': m.nome,
                'preco': float(m.preco),
                'foto': m.foto
            } for m in marmitas]
        })
    finally:
        db.close()

# ============ API: CRIAR PEDIDO ============
@app.route('/api/pedidos', methods=['POST'])
def criar_pedido():
    """Cria um novo pedido"""
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'error': 'Usuário não logado'}), 401
    
    db = SessionLocal()
    try:
        data = request.json
        
        # Validar campos obrigatórios
        if not data.get('cozinheiro_id'):
            return jsonify({'success': False, 'error': 'ID do cozinheiro é obrigatório'}), 400
        
        if not data.get('qtd_marmitas') or data['qtd_marmitas'] <= 0:
            return jsonify({'success': False, 'error': 'Quantidade de marmitas inválida'}), 400
        
        if not data.get('valor_total') or float(data['valor_total']) <= 0:
            return jsonify({'success': False, 'error': 'Valor total inválido'}), 400
        
        # Verificar se o cozinheiro existe
        cozinheiro = db.query(Cozinheiro).filter(Cozinheiro.id == data['cozinheiro_id']).first()
        if not cozinheiro:
            return jsonify({'success': False, 'error': 'Cozinheiro não encontrado'}), 404
        
        # Verificar se a marmita existe (se foi fornecida)
        marmita_id = data.get('marmita_id')
        if marmita_id:
            marmita = db.query(Marmita).filter(Marmita.id == marmita_id).first()
            if not marmita:
                return jsonify({'success': False, 'error': 'Marmita não encontrada'}), 404
            if marmita.cozinheiro_id != data['cozinheiro_id']:
                return jsonify({'success': False, 'error': 'Marmita não pertence a este cozinheiro'}), 400
        
        # Verificar se a proposta existe (se foi fornecida)
        proposta_id = data.get('proposta_id')
        if proposta_id:
            proposta = db.query(Proposta).filter(Proposta.id == proposta_id).first()
            if not proposta:
                return jsonify({'success': False, 'error': 'Proposta não encontrada'}), 404
            if proposta.cozinheiro_id != data['cozinheiro_id']:
                return jsonify({'success': False, 'error': 'Proposta não pertence a este cozinheiro'}), 400
            # Verificar se a proposta ainda está pendente
            if proposta.status_ != 0:
                return jsonify({'success': False, 'error': 'Esta proposta não está mais disponível'}), 400
        
        # Verificar se o cliente existe
        cliente = db.query(Cliente).filter(Cliente.id == session['usuario_id']).first()
        if not cliente:
            return jsonify({'success': False, 'error': 'Cliente não encontrado'}), 404
        
        # Validar se o cliente não está tentando pedir para si mesmo
        if session['usuario_id'] == data['cozinheiro_id']:
            return jsonify({'success': False, 'error': 'Você não pode fazer pedido para si mesmo'}), 400
        
        # Criar o pedido
        novo_pedido = Pedido(
            cozinheiro_id=data['cozinheiro_id'],
            cliente_id=session['usuario_id'],
            status='pendente',
            horario=datetime.now(),
            qtd_marmitas=data['qtd_marmitas'],
            val_total=Decimal(str(data['valor_total'])),
            marmita_id=marmita_id if marmita_id else None,
            proposta_id=proposta_id if proposta_id else None,
            plano_id=data.get('plano_id') if data.get('plano_id') else None,
            avaliacao=0  # Inicialmente sem avaliação
        )
        
        db.add(novo_pedido)
        db.commit()
        db.refresh(novo_pedido)
        
        # Se foi usada uma proposta, atualizar seu status para "aceita"
        if proposta_id:
            proposta.status_ = 1  # 1 = aceita
            proposta.data_aceita = datetime.now()
            db.commit()
        
        # Log do pedido criado
        print(f"Pedido #{novo_pedido.id} criado - Cliente: {cliente.nome}, Cozinheiro: {cozinheiro.nome}, Valor: R$ {novo_pedido.val_total}")
        
        return jsonify({
            'success': True, 
            'pedido_id': novo_pedido.id,
            'message': 'Pedido criado com sucesso!',
            'pedido': {
                'id': novo_pedido.id,
                'status': novo_pedido.status,
                'valor_total': float(novo_pedido.val_total),
                'qtd_marmitas': novo_pedido.qtd_marmitas,
                'horario': novo_pedido.horario.strftime('%d/%m/%Y %H:%M')
            }
        })
        
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar pedido: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()
        
# ============ API: PEDIDOS DO CLIENTE (ATUALIZADO COM PROPOSTA) ============
@app.route('/api/pedidos/cliente/<int:cliente_id>', methods=['GET'])
def pedidos_do_cliente(cliente_id):
    """Retorna todos os pedidos de um cliente"""
    if 'usuario_id' not in session or session['usuario_id'] != cliente_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        pedidos = db.query(Pedido).filter(Pedido.cliente_id == cliente_id).order_by(Pedido.horario.desc()).all()
        
        resultado = []
        for p in pedidos:
            # Buscar informações da proposta se existir
            proposta_info = None
            if p.proposta_id:
                proposta = db.query(Proposta).filter(Proposta.id == p.proposta_id).first()
                if proposta:
                    proposta_info = {
                        'id': proposta.id,
                        'valor': float(proposta.valor),
                        'receita_link': proposta.receita_link
                    }
            
            resultado.append({
                'id': p.id,
                'cozinheiro_nome': p.cozinheiro.nome if p.cozinheiro else 'Desconhecido',
                'cozinheiro_id': p.cozinheiro_id,
                'status': p.status,
                'data': p.horario.strftime('%d/%m/%Y'),
                'hora': p.horario.strftime('%H:%M'),
                'qtd_marmitas': p.qtd_marmitas,
                'valor_total': float(p.val_total),
                'avaliacao': p.avaliacao,
                'marmita_nome': p.marmita.nome if p.marmita else 'Marmita Padrão',
                'proposta_id': p.proposta_id,
                'proposta': proposta_info,
                'pode_avaliar': p.status == 'entregue' and p.avaliacao == 0
            })
        
        return jsonify(resultado)
    finally:
        db.close()

# ============ API: PEDIDOS DO COZINHEIRO (ATUALIZADO COM PROPOSTA) ============
@app.route('/api/pedidos/cozinheiro/<int:cozinheiro_id>', methods=['GET'])
def pedidos_do_cozinheiro(cozinheiro_id):
    """Retorna os pedidos de um cozinheiro para o painel"""
    if 'usuario_id' not in session or session['usuario_id'] != cozinheiro_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        pedidos = db.query(Pedido).filter(Pedido.cozinheiro_id == cozinheiro_id).order_by(Pedido.horario.desc()).all()
        
        resultado = []
        for p in pedidos:
            # Buscar informações da proposta se existir
            proposta_info = None
            if p.proposta_id:
                proposta = db.query(Proposta).filter(Proposta.id == p.proposta_id).first()
                if proposta:
                    proposta_info = {
                        'id': proposta.id,
                        'valor': float(proposta.valor),
                        'status': proposta.status_,
                        'receita_link': proposta.receita_link
                    }
            
            resultado.append({
                'id': p.id,
                'cliente_nome': p.cliente.nome if p.cliente else 'Cliente',
                'cliente_id': p.cliente_id,
                'status': p.status,
                'data': p.horario.strftime('%d/%m/%Y %H:%M'),
                'qtd_marmitas': p.qtd_marmitas,
                'valor_total': float(p.val_total),
                'avaliacao': p.avaliacao,
                'proposta_id': p.proposta_id,
                'proposta': proposta_info,
                'endereco_entrega': f"{p.cliente.rua}, {p.cliente.numero} - {p.cliente.complemento if p.cliente.complemento else ''}".strip()
            })
        
        return jsonify(resultado)
    finally:
        db.close()
        
# ============ API: ATUALIZAR STATUS DO PEDIDO ============
@app.route('/api/pedidos/<int:pedido_id>/status', methods=['PUT'])
def atualizar_status_pedido(pedido_id):
    """Atualiza o status de um pedido"""
    db = SessionLocal()
    try:
        data = request.json
        status = data.get('status')
        
        pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        
        if not pedido:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if session.get('usuario_tipo') != 'cozinheiro' or session['usuario_id'] != pedido.cozinheiro_id:
            return jsonify({'error': 'Não autorizado'}), 401
        
        pedido.status = status
        db.commit()
        
        return jsonify({'success': True, 'status': status})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

# ============ API: CRIAR AVALIAÇÃO ============
@app.route('/api/avaliacoes', methods=['POST'])
def criar_avaliacao():
    """Cria uma avaliação para um pedido"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Usuário não logado'}), 401
    
    db = SessionLocal()
    try:
        data = request.json
        
        # Validar campos
        pedido_id = data.get('pedido_id')
        nota = data.get('nota')
        
        if not pedido_id:
            return jsonify({'error': 'ID do pedido é obrigatório'}), 400
        
        if not nota or nota < 1 or nota > 5:
            return jsonify({'error': 'Nota inválida. Deve ser entre 1 e 5'}), 400
        
        # Buscar o pedido
        pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        
        if not pedido:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verificar se o pedido pertence ao cliente logado
        if session['usuario_id'] != pedido.cliente_id:
            return jsonify({'error': 'Não autorizado'}), 401
        
        # Verificar se o pedido já foi avaliado
        if pedido.avaliacao > 0:
            return jsonify({'error': 'Este pedido já foi avaliado'}), 400
        
        # Verificar se o pedido está entregue
        if pedido.status != 'entregue':
            return jsonify({'error': 'Apenas pedidos entregues podem ser avaliados'}), 400
        
        # Atualizar avaliação
        pedido.avaliacao = nota
        db.commit()
        
        # Atualizar média do cozinheiro
        from sqlalchemy import func
        media = db.query(func.avg(Pedido.avaliacao)).filter(
            Pedido.cozinheiro_id == pedido.cozinheiro_id,
            Pedido.avaliacao > 0
        ).scalar() or 0
        
        cozinheiro = db.query(Cozinheiro).filter(Cozinheiro.id == pedido.cozinheiro_id).first()
        if cozinheiro:
            cozinheiro.avaliacao = int(round(media))
            db.commit()
        
        # Buscar estatísticas atualizadas
        total_avaliacoes = db.query(Pedido).filter(
            Pedido.cozinheiro_id == pedido.cozinheiro_id,
            Pedido.avaliacao > 0
        ).count()
        
        return jsonify({
            'success': True, 
            'message': 'Avaliação enviada com sucesso!',
            'avaliacao': {
                'pedido_id': pedido.id,
                'nota': nota,
                'media_cozinheiro': float(media),
                'total_avaliacoes': total_avaliacoes
            }
        })
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar avaliação: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

# ============ API: DASHBOARD DO CLIENTE ============
@app.route('/api/dashboard/cliente/<int:cliente_id>', methods=['GET'])
def dashboard_cliente(cliente_id):
    """Retorna dados para o dashboard do cliente"""
    if 'usuario_id' not in session or session['usuario_id'] != cliente_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        from sqlalchemy import func
        
        total_pedidos = db.query(Pedido).filter(Pedido.cliente_id == cliente_id).count()
        
        pedidos_ativos = db.query(Pedido).filter(
            Pedido.cliente_id == cliente_id,
            Pedido.status.in_(['pendente', 'confirmado', 'preparando'])
        ).count()
        
        gasto_total = db.query(func.sum(Pedido.val_total)).filter(
            Pedido.cliente_id == cliente_id
        ).scalar() or 0
        
        ultimo_pedido = db.query(Pedido).filter(
            Pedido.cliente_id == cliente_id
        ).order_by(Pedido.horario.desc()).first()
        
        return jsonify({
            'total_pedidos': total_pedidos,
            'pedidos_ativos': pedidos_ativos,
            'gasto_total': float(gasto_total),
            'ultimo_pedido': {
                'status': ultimo_pedido.status if ultimo_pedido else None,
                'data': ultimo_pedido.horario.strftime('%d/%m/%Y') if ultimo_pedido else None
            } if ultimo_pedido else None
        })
    finally:
        db.close()

# ============ API: DASHBOARD DO COZINHEIRO ============
@app.route('/api/dashboard/cozinheiro/<int:cozinheiro_id>', methods=['GET'])
def dashboard_cozinheiro(cozinheiro_id):
    """Retorna dados para o dashboard do cozinheiro"""
    if 'usuario_id' not in session or session['usuario_id'] != cozinheiro_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        from sqlalchemy import func
        
        total_pedidos = db.query(Pedido).filter(Pedido.cozinheiro_id == cozinheiro_id).count()
        
        pedidos_pendentes = db.query(Pedido).filter(
            Pedido.cozinheiro_id == cozinheiro_id,
            Pedido.status == 'pendente'
        ).count()
        
        faturamento_total = db.query(func.sum(Pedido.val_total)).filter(
            Pedido.cozinheiro_id == cozinheiro_id,
            Pedido.status.in_(['entregue', 'confirmado'])
        ).scalar() or 0
        
        media_avaliacao = db.query(func.avg(Pedido.avaliacao)).filter(
            Pedido.cozinheiro_id == cozinheiro_id,
            Pedido.avaliacao > 0
        ).scalar() or 0
        
        return jsonify({
            'total_pedidos': total_pedidos,
            'pedidos_pendentes': pedidos_pendentes,
            'faturamento_total': float(faturamento_total),
            'media_avaliacao': float(media_avaliacao),
            'total_marmitas': db.query(Marmita).filter(Marmita.cozinheiro_id == cozinheiro_id).count()
        })
    finally:
        db.close()

# ============ API: LISTAR ESPECIALIDADES ============
@app.route('/api/especialidades', methods=['GET'])
def listar_especialidades():
    """Retorna lista de especialidades para o select"""
    db = SessionLocal()
    try:
        especialidades = db.query(Especialidade).all()
        return jsonify([{'id': e.id, 'nome': e.nome} for e in especialidades])
    finally:
        db.close()

# ============ API: PERFIL DO USUÁRIO ============
@app.route('/api/perfil', methods=['GET'])
def get_perfil():
    """Retorna os dados do perfil do usuário logado"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        if session['usuario_tipo'] == 'cliente':
            usuario = db.query(Cliente).filter(Cliente.id == session['usuario_id']).first()
            if not usuario:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            return jsonify({
                'id': usuario.id,
                'nome': usuario.nome,
                'email': usuario.email,
                'telefone': usuario.telefone,
                'cep': usuario.cep,
                'rua': usuario.rua,
                'numero': usuario.numero,
                'complemento': usuario.complemento,
                'restricao': usuario.restricao,
                'tipo': 'cliente'
            })
        else:
            usuario = db.query(Cozinheiro).filter(Cozinheiro.id == session['usuario_id']).first()
            if not usuario:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            return jsonify({
                'id': usuario.id,
                'nome': usuario.nome,
                'email': usuario.email,
                'telefone': usuario.telefone,
                'cep': usuario.cep,
                'rua': usuario.rua,
                'numero': usuario.numero,
                'complemento': usuario.complemento,
                'sobre_voce': usuario.sobre_voce,
                'tipo_entrega': usuario.tipo_entrega,
                'especialidade_id': usuario.especialidade_id,
                'tipo': 'cozinheiro'
            })
    finally:
        db.close()

# ============ API: ATUALIZAR PERFIL ============
@app.route('/api/perfil', methods=['PUT'])
def atualizar_perfil():
    """Atualiza os dados do perfil do usuário logado"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        data = request.json
        
        if session['usuario_tipo'] == 'cliente':
            usuario = db.query(Cliente).filter(Cliente.id == session['usuario_id']).first()
            if not usuario:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            # Atualizar campos
            if 'nome' in data:
                usuario.nome = data['nome']
            if 'telefone' in data:
                valido, telefone = validar_telefone(db, data['telefone'], 'cliente', session['usuario_id'])
            if 'telefone' in data:
                valido, telefone = validar_telefone(db, data['telefone'], 'cliente', session['usuario_id'])
            if not valido:
                return jsonify({'error': telefone}), 400
            usuario.telefone = telefone
            if 'cep' in data:
                usuario.cep = data['cep']
            if 'rua' in data:
                usuario.rua = data['rua']
            if 'numero' in data:
                usuario.numero = int(data['numero']) if str(data['numero']).isdigit() else 0
            if 'complemento' in data:
                usuario.complemento = data['complemento']
            if 'restricao' in data:
                usuario.restricao = data['restricao']
            
            # Atualizar senha se fornecida
            if 'senha' in data and data['senha']:
                valido, senha_hash = validar_senha(data['senha'])
                if not valido:
                    return jsonify({'error': senha_hash}), 400
                usuario.senha = senha_hash
            
            db.commit()
            
            # Atualizar sessão
            session['usuario_nome'] = usuario.nome
            
            return jsonify({'success': True, 'message': 'Perfil atualizado com sucesso!'})
            
        else:  # cozinheiro
            usuario = db.query(Cozinheiro).filter(Cozinheiro.id == session['usuario_id']).first()
            if not usuario:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            
            # Atualizar campos
            if 'nome' in data:
                usuario.nome = data['nome']
            if 'telefone' in data:
                valido, telefone = validar_telefone(db, data['telefone'], 'cozinheiro', session['usuario_id'])
                if not valido:
                    return jsonify({'error': telefone}), 400
                usuario.telefone = telefone
            if 'cep' in data:
                usuario.cep = data['cep']
            if 'rua' in data:
                usuario.rua = data['rua']
            if 'numero' in data:
                usuario.numero = int(data['numero']) if str(data['numero']).isdigit() else 0
            if 'complemento' in data:
                usuario.complemento = data['complemento']
            if 'sobre_voce' in data:
                usuario.sobre_voce = data['sobre_voce']
            if 'tipo_entrega' in data:
                usuario.tipo_entrega = data['tipo_entrega']
            if 'especialidade_id' in data:
                # Verificar se especialidade existe
                especialidade = db.query(Especialidade).filter(Especialidade.id == data['especialidade_id']).first()
                if especialidade:
                    usuario.especialidade_id = especialidade.id
            
            # Atualizar senha se fornecida
            if 'senha' in data and data['senha']:
                valido, senha_hash = validar_senha(data['senha'])
                if not valido:
                    return jsonify({'error': senha_hash}), 400
                usuario.senha = senha_hash
            
            db.commit()
            
            # Atualizar sessão
            session['usuario_nome'] = usuario.nome
            
            return jsonify({'success': True, 'message': 'Perfil atualizado com sucesso!'})
            
    except Exception as e:
        db.rollback()
        print(f"Erro ao atualizar perfil: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: CRIAR MARMITA ============
@app.route('/api/marmitas', methods=['POST'])
def criar_marmita():
    """Cria uma nova marmita para o cozinheiro"""
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cozinheiro':
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        data = request.json
        
        nova_marmita = Marmita(
            nome=data['nome'],
            preco=Decimal(str(data['preco'])),
            cozinheiro_id=session['usuario_id'],
            foto=data.get('foto')
        )
        
        db.add(nova_marmita)
        db.commit()
        db.refresh(nova_marmita)
        
        return jsonify({
            'success': True,
            'marmita': {
                'id': nova_marmita.id,
                'nome': nova_marmita.nome,
                'preco': float(nova_marmita.preco),
                'foto': nova_marmita.foto
            }
        })
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar marmita: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: LISTAR MARMITAS DO COZINHEIRO ============
@app.route('/api/marmitas/cozinheiro/<int:cozinheiro_id>', methods=['GET'])
def listar_marmitas_cozinheiro(cozinheiro_id):
    """Retorna todas as marmitas de um cozinheiro"""
    db = SessionLocal()
    try:
        marmitas = db.query(Marmita).filter(Marmita.cozinheiro_id == cozinheiro_id).all()
        
        return jsonify([{
            'id': m.id,
            'nome': m.nome,
            'preco': float(m.preco),
            'foto': m.foto
        } for m in marmitas])
    finally:
        db.close()


# ============ API: ATUALIZAR MARMITA ============
@app.route('/api/marmitas/<int:marmita_id>', methods=['PUT'])
def atualizar_marmita(marmita_id):
    """Atualiza os dados de uma marmita"""
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cozinheiro':
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        marmita = db.query(Marmita).filter(Marmita.id == marmita_id).first()
        
        if not marmita:
            return jsonify({'error': 'Marmita não encontrada'}), 404
        
        if marmita.cozinheiro_id != session['usuario_id']:
            return jsonify({'error': 'Não autorizado'}), 401
        
        data = request.json
        
        if 'nome' in data:
            marmita.nome = data['nome']
        if 'preco' in data:
            marmita.preco = Decimal(str(data['preco']))
        if 'foto' in data:
            marmita.foto = data['foto']
        
        db.commit()
        
        return jsonify({
            'success': True,
            'marmita': {
                'id': marmita.id,
                'nome': marmita.nome,
                'preco': float(marmita.preco),
                'foto': marmita.foto
            }
        })
    except Exception as e:
        db.rollback()
        print(f"Erro ao atualizar marmita: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: DELETAR MARMITA ============
@app.route('/api/marmitas/<int:marmita_id>', methods=['DELETE'])
def deletar_marmita(marmita_id):
    """Deleta uma marmita"""
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cozinheiro':
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        marmita = db.query(Marmita).filter(Marmita.id == marmita_id).first()
        
        if not marmita:
            return jsonify({'error': 'Marmita não encontrada'}), 404
        
        if marmita.cozinheiro_id != session['usuario_id']:
            return jsonify({'error': 'Não autorizado'}), 401
        
        # Verificar se há pedidos associados
        pedidos_associados = db.query(Pedido).filter(Pedido.marmita_id == marmita_id).count()
        if pedidos_associados > 0:
            return jsonify({'error': 'Não é possível deletar marmita com pedidos associados'}), 400
        
        db.delete(marmita)
        db.commit()
        
        return jsonify({'success': True, 'message': 'Marmita deletada com sucesso!'})
    except Exception as e:
        db.rollback()
        print(f"Erro ao deletar marmita: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: CRIAR PROPOSTA ============
@app.route('/api/propostas', methods=['POST'])
def criar_proposta():
    """Cria uma nova proposta para uma receita"""
    if 'usuario_id' not in session or session.get('usuario_tipo') != 'cozinheiro':
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        data = request.json
        
        nova_proposta = Proposta(
            valor=Decimal(str(data['valor'])),
            cozinheiro_id=session['usuario_id'],
            status_=0,  # 0 = pendente
            data_criacao=datetime.now(),
            receita_link=data.get('receita_link')
        )
        
        db.add(nova_proposta)
        db.commit()
        db.refresh(nova_proposta)
        
        return jsonify({
            'success': True,
            'proposta': {
                'id': nova_proposta.id,
                'valor': float(nova_proposta.valor),
                'status': nova_proposta.status_,
                'data_criacao': nova_proposta.data_criacao.strftime('%d/%m/%Y %H:%M'),
                'receita_link': nova_proposta.receita_link
            }
        })
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar proposta: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: LISTAR PROPOSTAS DO COZINHEIRO ============
@app.route('/api/propostas/cozinheiro/<int:cozinheiro_id>', methods=['GET'])
def listar_propostas_cozinheiro(cozinheiro_id):
    """Retorna todas as propostas de um cozinheiro"""
    if 'usuario_id' not in session or session['usuario_id'] != cozinheiro_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        propostas = db.query(Proposta).filter(Proposta.cozinheiro_id == cozinheiro_id).order_by(Proposta.data_criacao.desc()).all()
        
        return jsonify([{
            'id': p.id,
            'valor': float(p.valor),
            'status': p.status_,
            'status_texto': 'Pendente' if p.status_ == 0 else 'Aceita' if p.status_ == 1 else 'Recusada',
            'data_criacao': p.data_criacao.strftime('%d/%m/%Y %H:%M'),
            'data_aceita': p.data_aceita.strftime('%d/%m/%Y %H:%M') if p.data_aceita else None,
            'receita_link': p.receita_link
        } for p in propostas])
    finally:
        db.close()


# ============ API: ATUALIZAR STATUS DA PROPOSTA ============
@app.route('/api/propostas/<int:proposta_id>/status', methods=['PUT'])
def atualizar_status_proposta(proposta_id):
    """Atualiza o status de uma proposta (admin/cliente)"""
    db = SessionLocal()
    try:
        data = request.json
        status = data.get('status')  # 0: pendente, 1: aceita, 2: recusada
        
        proposta = db.query(Proposta).filter(Proposta.id == proposta_id).first()
        
        if not proposta:
            return jsonify({'error': 'Proposta não encontrada'}), 404
        
        proposta.status_ = status
        if status == 1:  # Aceita
            proposta.data_aceita = datetime.now()
        
        db.commit()
        
        return jsonify({'success': True, 'status': status})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============ API: ESTATÍSTICAS GERAIS ============
@app.route('/api/estatisticas/gerais', methods=['GET'])
def estatisticas_gerais():
    """Retorna estatísticas gerais do sistema"""
    db = SessionLocal()
    try:
        from sqlalchemy import func
        
        total_cozinheiros = db.query(Cozinheiro).count()
        total_clientes = db.query(Cliente).count()
        total_pedidos = db.query(Pedido).count()
        total_pedidos_entregues = db.query(Pedido).filter(Pedido.status == 'entregue').count()
        
        faturamento_total = db.query(func.sum(Pedido.val_total)).filter(
            Pedido.status == 'entregue'
        ).scalar() or 0
        
        avaliacao_media_geral = db.query(func.avg(Pedido.avaliacao)).filter(
            Pedido.avaliacao > 0
        ).scalar() or 0
        
        # Pedidos por mês (últimos 6 meses)
        pedidos_por_mes = []
        from dateutil.relativedelta import relativedelta
        
        for i in range(5, -1, -1):
            data_inicio = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=i)
            data_fim = (data_inicio + relativedelta(months=1)) - timedelta(days=1)
            
            total = db.query(Pedido).filter(
                Pedido.horario >= data_inicio,
                Pedido.horario <= data_fim
            ).count()
            
            pedidos_por_mes.append({
                'mes': data_inicio.strftime('%B/%Y'),
                'total': total
            })
        
        return jsonify({
            'total_cozinheiros': total_cozinheiros,
            'total_clientes': total_clientes,
            'total_pedidos': total_pedidos,
            'total_pedidos_entregues': total_pedidos_entregues,
            'faturamento_total': float(faturamento_total),
            'avaliacao_media_geral': float(avaliacao_media_geral),
            'pedidos_por_mes': pedidos_por_mes,
            'taxa_sucesso': (total_pedidos_entregues / total_pedidos * 100) if total_pedidos > 0 else 0
        })
    finally:
        db.close()


# ============ API: BUSCAR PEDIDOS POR FILTROS ============
@app.route('/api/pedidos/buscar', methods=['GET'])
def buscar_pedidos():
    """Busca pedidos com filtros (admin)"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        status = request.args.get('status')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        cozinheiro_id = request.args.get('cozinheiro_id')
        cliente_id = request.args.get('cliente_id')
        
        query = db.query(Pedido)
        
        if status:
            query = query.filter(Pedido.status == status)
        if data_inicio:
            query = query.filter(Pedido.horario >= datetime.strptime(data_inicio, '%Y-%m-%d'))
        if data_fim:
            query = query.filter(Pedido.horario <= datetime.strptime(data_fim, '%Y-%m-%d') + timedelta(days=1))
        if cozinheiro_id:
            query = query.filter(Pedido.cozinheiro_id == int(cozinheiro_id))
        if cliente_id:
            query = query.filter(Pedido.cliente_id == int(cliente_id))
        
        pedidos = query.order_by(Pedido.horario.desc()).limit(100).all()
        
        return jsonify([{
            'id': p.id,
            'cozinheiro_nome': p.cozinheiro.nome if p.cozinheiro else 'N/A',
            'cliente_nome': p.cliente.nome if p.cliente else 'N/A',
            'status': p.status,
            'data': p.horario.strftime('%d/%m/%Y %H:%M'),
            'qtd_marmitas': p.qtd_marmitas,
            'valor_total': float(p.val_total),
            'avaliacao': p.avaliacao
        } for p in pedidos])
    finally:
        db.close()

# ============ API: BUSCAR PEDIDO POR ID (DETALHES COMPLETOS) ============
@app.route('/api/pedidos/<int:pedido_id>', methods=['GET'])
def detalhes_pedido(pedido_id):
    """Retorna detalhes completos de um pedido específico"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        
        if not pedido:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verificar permissão (cliente, cozinheiro ou admin do pedido)
        usuario_tipo = session.get('usuario_tipo')
        if session['usuario_id'] != pedido.cliente_id and session['usuario_id'] != pedido.cozinheiro_id and usuario_tipo != 'admin':
            return jsonify({'error': 'Não autorizado'}), 401
        
        # Preparar dados da proposta se existir
        proposta_info = None
        if pedido.proposta_id:
            proposta = db.query(Proposta).filter(Proposta.id == pedido.proposta_id).first()
            if proposta:
                proposta_info = {
                    'id': proposta.id,
                    'valor': float(proposta.valor),
                    'status': proposta.status_,
                    'status_texto': 'Pendente' if proposta.status_ == 0 else 'Aceita' if proposta.status_ == 1 else 'Recusada',
                    'data_criacao': proposta.data_criacao.strftime('%d/%m/%Y %H:%M'),
                    'data_aceita': proposta.data_aceita.strftime('%d/%m/%Y %H:%M') if proposta.data_aceita else None,
                    'receita_link': proposta.receita_link
                }
        
        # Preparar dados da marmita se existir
        marmita_info = None
        if pedido.marmita_id:
            marmita = db.query(Marmita).filter(Marmita.id == pedido.marmita_id).first()
            if marmita:
                marmita_info = {
                    'id': marmita.id,
                    'nome': marmita.nome,
                    'preco': float(marmita.preco),
                    'foto': marmita.foto
                }
        
        # Preparar dados do plano se existir
        plano_info = None
        if pedido.plano_id:
            plano = db.query(Especialidade).filter(Especialidade.id == pedido.plano_id).first()
            if plano:
                plano_info = {
                    'id': plano.id,
                    'nome': plano.nome
                }
        
        # Verificar se o pedido pode ser avaliado
        pode_avaliar = (
            pedido.status == 'entregue' and 
            pedido.avaliacao == 0 and 
            session['usuario_id'] == pedido.cliente_id
        )
        
        # Verificar se o pedido pode ser cancelado
        pode_cancelar = (
            pedido.status in ['pendente', 'confirmado'] and
            session['usuario_id'] == pedido.cliente_id
        )
        
        # Verificar se o pedido pode ser atualizado pelo cozinheiro
        pode_atualizar_status = (
            session['usuario_id'] == pedido.cozinheiro_id and
            pedido.status not in ['entregue', 'cancelado']
        )
        
        # Lista de status possíveis para atualização
        status_disponiveis = []
        if pode_atualizar_status:
            status_flow = {
                'pendente': ['confirmado', 'cancelado'],
                'confirmado': ['preparando', 'cancelado'],
                'preparando': ['saiu_entrega', 'cancelado'],
                'saiu_entrega': ['entregue'],
                'entregue': [],
                'cancelado': []
            }
            status_disponiveis = status_flow.get(pedido.status, [])
        
        # Construir endereço completo do cliente
        endereco_cliente = f"{pedido.cliente.rua}, {pedido.cliente.numero}"
        if pedido.cliente.complemento:
            endereco_cliente += f" - {pedido.cliente.complemento}"
        
        return jsonify({
            'success': True,
            'pedido': {
                'id': pedido.id,
                'status': pedido.status,
                'status_texto': {
                    'pendente': 'Pendente',
                    'confirmado': 'Confirmado',
                    'preparando': 'Preparando',
                    'saiu_entrega': 'Saiu para Entrega',
                    'entregue': 'Entregue',
                    'cancelado': 'Cancelado'
                }.get(pedido.status, pedido.status),
                'horario': pedido.horario.strftime('%d/%m/%Y %H:%M'),
                'horario_iso': pedido.horario.isoformat(),
                'qtd_marmitas': pedido.qtd_marmitas,
                'valor_total': float(pedido.val_total),
                'valor_unitario': float(pedido.val_total / pedido.qtd_marmitas) if pedido.qtd_marmitas > 0 else 0,
                'avaliacao': pedido.avaliacao,
                'pode_avaliar': pode_avaliar,
                'pode_cancelar': pode_cancelar,
                'pode_atualizar_status': pode_atualizar_status,
                'status_disponiveis': status_disponiveis
            },
            'cliente': {
                'id': pedido.cliente.id,
                'nome': pedido.cliente.nome,
                'email': pedido.cliente.email,
                'telefone': pedido.cliente.telefone,
                'endereco_completo': endereco_cliente,
                'rua': pedido.cliente.rua,
                'numero': pedido.cliente.numero,
                'complemento': pedido.cliente.complemento if pedido.cliente.complemento else '',
                'cep': pedido.cliente.cep,
                'restricao': pedido.cliente.restricao
            } if pedido.cliente else None,
            'cozinheiro': {
                'id': pedido.cozinheiro.id,
                'nome': pedido.cozinheiro.nome,
                'email': pedido.cozinheiro.email,
                'telefone': pedido.cozinheiro.telefone,
                'especialidade': pedido.cozinheiro.especialidade.nome if pedido.cozinheiro.especialidade else None,
                'avaliacao': pedido.cozinheiro.avaliacao,
                'foto': pedido.cozinheiro.foto_link,
                'tipo_entrega': pedido.cozinheiro.tipo_entrega,
                'sobre': pedido.cozinheiro.sobre_voce
            } if pedido.cozinheiro else None,
            'proposta': proposta_info,
            'marmita': marmita_info,
            'plano': plano_info
        })
        
    except Exception as e:
        print(f"Erro ao buscar detalhes do pedido {pedido_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Erro ao buscar detalhes do pedido'}), 500
    finally:
        db.close()

# ============ ROTA PARA PÁGINA 404 ============
@app.errorhandler(404)
def pagina_nao_encontrada(e):
    """Página não encontrada"""
    return jsonify({'error': 'Página não encontrada'}), 404


# ============ ROTA PARA ERROS 500 ============
@app.errorhandler(500)
def erro_interno(e):
    """Erro interno do servidor"""
    return jsonify({'error': 'Erro interno do servidor'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)