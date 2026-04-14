from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from datetime import datetime
import sys
import os
import requests
from werkzeug.security import generate_password_hash, check_password_hash
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from views.models import Cozinheiro, Cliente, Pedido, Especialidade, Proposta, Marmita

app = Flask(__name__, 
            template_folder='../../web-prototype',
            static_folder='../../web-prototype')

# Configuração da sessão
app.secret_key = 'sua-chave-secreta-mude-para-uma-chave-forte'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False

CORS(app, supports_credentials=True)

# Criar tabelas se não existirem
Base.metadata.create_all(bind=engine)

# ============ ROTAS DAS PÁGINAS HTML ============

def validar_email(email):
    """Valida formato do email e verifica se já existe"""
    if not email:
        return False, "E-mail é obrigatório"
    
    # Valida formato
    padrao_email = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(padrao_email, email):
        return False, "E-mail inválido. Use um formato como usuario@exemplo.com"
    
    # Verifica se já existe
    if Cliente.query.filter_by(email=email).first():
        return False, "Este e-mail já está cadastrado"
    
    return True, email  # Retorna o email válido

def validar_telefone(telefone):
    """Valida formato do telefone e verifica se já existe"""
    if not telefone:
        return False, "Telefone é obrigatório"
    
    # Remove formatação
    telefone_limpo = re.sub(r'\D', '', telefone)
    
    # Verifica tamanho (compatível com String(20) do banco)
    if len(telefone_limpo) < 10 or len(telefone_limpo) > 11:
        return False, "Telefone inválido. Use um número com 10 ou 11 dígitos (incluindo DDD)"
    
    # Verifica formato de celular com 11 dígitos
    if len(telefone_limpo) == 11 and telefone_limpo[2] != '9':
        return False, "Celular com 11 dígitos deve começar com 9 após o DDD"
    
    # Verifica se já existe
    if Cliente.query.filter_by(telefone=telefone_limpo).first():
        return False, "Este telefone já está cadastrado"
    
    return True, telefone_limpo

def validar_senha(senha, confirmar_senha):
    """Valida força da senha"""
    if not senha:
        return False, "Senha é obrigatória"
    
    if senha != confirmar_senha:
        return False, "As senhas não conferem"
    
    if len(senha) < 8:
        return False, "A senha deve ter no mínimo 8 caracteres"
    
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
    
    return True, generate_password_hash(senha)  # Retorna o hash da senha

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
    """Processa o cadastro vindo do formulário HTML (sem JS)"""
    
    # Verificar qual tipo de cadastro (cliente ou cozinheiro)
    tipo = request.form.get('tipo_cadastro', 'cliente')
    
    if tipo == 'cliente':
        return cadastrar_cliente_form()
    else:
        return cadastrar_cozinheiro_form()

def cadastrar_cliente_form():
    """Cadastra um novo cliente via formulário HTML"""
    db = SessionLocal()
    try:
        # Pegar dados do formulário
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip()
        telefone = request.form.get('telefone', '').strip()
        senha = request.form.get('senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')
        
        # Dados de endereço
        cep = request.form.get('cep', '').strip()
        logradouro = request.form.get('logradouro', '').strip()
        numero = request.form.get('numero', '0').strip()
        complemento = request.form.get('complemento', '').strip()
        bairro = request.form.get('bairro', '').strip()
        cidade = request.form.get('cidade', '').strip()
        uf = request.form.get('uf', '').strip()
        
        # Dados específicos do cliente
        objetivo = request.form.get('objetivo', '')
        restricao = request.form.get('restricao', '')
        
        # Validações
        valido, email_valido = validar_email(email)
        if not valido:
            return render_template('cadastro.html', erro=email_valido)
        
        valido, telefone_valido = validar_telefone(telefone)
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
            numero=numero,
            complemento=complemento,
            restricao=restricao
        )
            
        db.add(novo_cliente)
        db.commit()
        db.refresh(novo_cliente)
        
        # Salvar na sessão
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
        # Pegar dados do formulário
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip()
        telefone = request.form.get('telefone', '').strip()
        senha = request.form.get('senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')
        
        # Dados de endereço
        cep = request.form.get('cep', '').strip()
        logradouro = request.form.get('logradouro', '').strip()
        numero = request.form.get('numero', '0').strip()
        complemento = request.form.get('complemento', '').strip()
        bairro = request.form.get('bairro', '').strip()
        cidade = request.form.get('cidade', '').strip()
        uf = request.form.get('uf', '').strip()
        
        # Dados específicos do cozinheiro
        especialidades = request.form.getlist('especialidades')  # Pega múltiplos valores
        preco_marmita = request.form.get('preco_marmita', '')
        raio_entrega = request.form.get('raio_entrega', 'bairro')
        sobre_voce = request.form.get('sobre_voce', '')
        
        # Validações
        valido, email_valido = validar_email(email)
        if not valido:
            return render_template('cadastro.html', erro=email_valido)
        
        valido, telefone_valido = validar_telefone(telefone)
        if not valido:
            return render_template('cadastro.html', erro=telefone_valido)
        
        valido, senha_hash = validar_senha(senha, confirmar_senha)
        if not valido:
            return render_template('cadastro.html', erro=senha_hash)
        
        # Criar/obter especialidade (usa a primeira selecionada ou "Geral")
        especialidade_nome = especialidades[0] if especialidades else 'Geral'
        
        especialidade = db.query(Especialidade).filter(Especialidade.nome == especialidade_nome).first()
        if not especialidade:
            especialidade = Especialidade(nome=especialidade_nome)
            db.add(especialidade)
            db.commit()
            db.refresh(especialidade)
        
        # Construir o campo rua
        rua_completa = f"{logradouro}, {numero}" if logradouro else ""
        if complemento:
            rua_completa += f" - {complemento}"
        
        # Criar novo cozinheiro
        novo_cozinheiro = Cozinheiro(
            nome=nome,
            email=email,
            telefone=telefone,
            senha=generate_password_hash(senha),
            rua=rua_completa,
            cep=cep,
            complemento=complemento,
            numero=int(numero) if numero.isdigit() else 0,
            especialidade_id=especialidade.id,
            sobre_voce=sobre_voce,
            tipo_entrega=raio_entrega
        )
        
        db.add(novo_cozinheiro)
        db.commit()
        db.refresh(novo_cozinheiro)
        
        # Se tiver preço da marmita, criar uma marmita padrão
        if preco_marmita and preco_marmita.strip():
            try:
                marmita = Marmita(
                    nome="Marmita Personalizada",
                    preco=float(preco_marmita),
                    cozinheiro_id=novo_cozinheiro.id
                )
                db.add(marmita)
                db.commit()
            except Exception as e:
                print(f"Erro ao criar marmita: {e}")
                # Se falhar, continua sem marmita
        
        # Salvar na sessão
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
            if not usuario:
                return jsonify({'success': False, 'error': 'Email ou senha incorretos'}), 401
            
            if not check_password_hash(usuario.senha, senha):
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
            if not usuario:
                return jsonify({'success': False, 'error': 'Email ou senha incorretos'}), 401
            
            if not check_password_hash(usuario.senha, senha):
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
        cozinheiros = db.query(Cozinheiro).all()
        return jsonify([{
            'id': c.id,
            'nome': c.nome,
            'avaliacao': c.avaliacao,
            'especialidade': c.especialidade.nome if c.especialidade else None,
            'localizacao': c.cep,
            'rua': c.rua,
            'sobre': c.sobre_voce,
            'foto': c.foto_link
        } for c in cozinheiros])
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
            'tipo_entrega': cozinheiro.tipo_entrega
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
        
        novo_pedido = Pedido(
            cozinheiro_id=data['cozinheiro_id'],
            cliente_id=session['usuario_id'],
            status='pendente',
            horario=datetime.now(),
            qtd_marmitas=data['qtd_marmitas'],
            val_total=data['valor_total']
        )
        
        db.add(novo_pedido)
        db.commit()
        db.refresh(novo_pedido)
        
        return jsonify({'success': True, 'pedido_id': novo_pedido.id})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


# ============ API: PEDIDOS DO CLIENTE ============
@app.route('/api/pedidos/cliente/<int:cliente_id>', methods=['GET'])
def pedidos_do_cliente(cliente_id):
    """Retorna todos os pedidos de um cliente"""
    if 'usuario_id' not in session or session['usuario_id'] != cliente_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        pedidos = db.query(Pedido).filter(Pedido.cliente_id == cliente_id).order_by(Pedido.horario.desc()).all()
        
        return jsonify([{
            'id': p.id,
            'cozinheiro_nome': p.cozinheiro.nome if p.cozinheiro else 'Desconhecido',
            'status': p.status,
            'data': p.horario.strftime('%d/%m/%Y'),
            'qtd_marmitas': p.qtd_marmitas,
            'valor_total': float(p.val_total),
            'avaliacao': p.avaliacao
        } for p in pedidos])
    finally:
        db.close()


# ============ API: PEDIDOS DO COZINHEIRO ============
@app.route('/api/pedidos/cozinheiro/<int:cozinheiro_id>', methods=['GET'])
def pedidos_do_cozinheiro(cozinheiro_id):
    """Retorna os pedidos de um cozinheiro para o painel"""
    if 'usuario_id' not in session or session['usuario_id'] != cozinheiro_id:
        return jsonify({'error': 'Não autorizado'}), 401
    
    db = SessionLocal()
    try:
        pedidos = db.query(Pedido).filter(Pedido.cozinheiro_id == cozinheiro_id).order_by(Pedido.horario.desc()).all()
        
        return jsonify([{
            'id': p.id,
            'cliente_nome': p.cliente.nome if p.cliente else 'Cliente',
            'status': p.status,
            'data': p.horario.strftime('%d/%m/%Y %H:%M'),
            'qtd_marmitas': p.qtd_marmitas,
            'valor_total': float(p.val_total)
        } for p in pedidos])
    finally:
        db.close()


# ============ API: ATUALIZAR STATUS DO PEDIDO ============
@app.route('/api/pedidos/<int:pedido_id>/status', methods=['PUT'])
def atualizar_status_pedido(pedido_id):
    """Atualiza o status de um pedido"""
    db = SessionLocal()
    try:
        status = request.args.get('status')
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
        pedido = db.query(Pedido).filter(Pedido.id == data['pedido_id']).first()
        
        if not pedido:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if session['usuario_id'] != pedido.cliente_id:
            return jsonify({'error': 'Não autorizado'}), 401
        
        pedido.avaliacao = data['nota']
        db.commit()
        
        from sqlalchemy import func
        media = db.query(func.avg(Pedido.avaliacao)).filter(
            Pedido.cozinheiro_id == pedido.cozinheiro_id,
            Pedido.avaliacao > 0
        ).scalar() or 0
        
        cozinheiro = db.query(Cozinheiro).filter(Cozinheiro.id == pedido.cozinheiro_id).first()
        if cozinheiro:
            cozinheiro.avaliacao = int(media)
            db.commit()
        
        return jsonify({'success': True, 'message': 'Avaliação enviada com sucesso!'})
    except Exception as e:
        db.rollback()
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
        
        return jsonify({
            'total_pedidos': total_pedidos,
            'pedidos_ativos': pedidos_ativos,
            'gasto_total': float(gasto_total)
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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)