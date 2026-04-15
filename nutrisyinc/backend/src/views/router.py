from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, desc
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from src.database import get_db
from src.views import models, schemas
from src.views.models import Cozinheiro, Cliente, Pedido, Proposta, Marmita, Especialidade

router = APIRouter(prefix="/views", tags=["Views e Dashboards"])

# ============ DASHBOARDS ============

@router.get("/dashboard/cozinheiro/{cozinheiro_id}", response_model=schemas.DashboardCozinheiro)
async def dashboard_cozinheiro(
    cozinheiro_id: int,
    db: Session = Depends(get_db)
):
    """Dashboard completo para o cozinheiro"""
    
    # Verificar se cozinheiro existe
    cozinheiro = db.query(Cozinheiro).filter(Cozinheiro.id == cozinheiro_id).first()
    if not cozinheiro:
        raise HTTPException(status_code=404, detail="Cozinheiro não encontrado")
    
    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    inicio_mes = hoje.replace(day=1)
    
    # Totais
    total_pedidos = db.query(Pedido).filter(Pedido.cozinheiro_id == cozinheiro_id).count()
    pedidos_hoje = db.query(Pedido).filter(
        Pedido.cozinheiro_id == cozinheiro_id,
        Pedido.horario >= hoje
    ).count()
    pedidos_semana = db.query(Pedido).filter(
        Pedido.cozinheiro_id == cozinheiro_id,
        Pedido.horario >= inicio_semana
    ).count()
    
    # Faturamento
    faturamento_total = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.cozinheiro_id == cozinheiro_id,
        Pedido.status == "entregue"
    ).scalar() or Decimal(0)
    
    faturamento_mes = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.cozinheiro_id == cozinheiro_id,
        Pedido.status == "entregue",
        Pedido.horario >= inicio_mes
    ).scalar() or Decimal(0)
    
    # Avaliação média
    avaliacao_media = db.query(func.avg(Pedido.avaliacao)).filter(
        Pedido.cozinheiro_id == cozinheiro_id,
        Pedido.avaliacao > 0
    ).scalar() or 0
    
    # Marmitas
    total_marmitas = db.query(Marmita).filter(Marmita.cozinheiro_id == cozinheiro_id).count()
    
    # Propostas
    total_propostas = db.query(Proposta).filter(Proposta.cozinheiro_id == cozinheiro_id).count()
    propostas_pendentes = db.query(Proposta).filter(
        Proposta.cozinheiro_id == cozinheiro_id,
        Proposta.status_ == 0
    ).count()
    
    # Pedidos por status
    pedidos_por_status = {}
    status_list = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue", "cancelado"]
    for status in status_list:
        count = db.query(Pedido).filter(
            Pedido.cozinheiro_id == cozinheiro_id,
            Pedido.status == status
        ).count()
        pedidos_por_status[status] = count
    
    return schemas.DashboardCozinheiro(
        total_pedidos=total_pedidos,
        pedidos_hoje=pedidos_hoje,
        pedidos_semana=pedidos_semana,
        faturamento_total=faturamento_total,
        faturamento_mes=faturamento_mes,
        avaliacao_media=float(avaliacao_media),
        total_marmitas=total_marmitas,
        total_propostas=total_propostas,
        propostas_pendentes=propostas_pendentes,
        pedidos_por_status=pedidos_por_status
    )


@router.get("/dashboard/cliente/{cliente_id}", response_model=schemas.DashboardCliente)
async def dashboard_cliente(
    cliente_id: int,
    db: Session = Depends(get_db)
):
    """Dashboard completo para o cliente"""
    
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_mes = hoje.replace(day=1)
    
    # Totais
    total_pedidos = db.query(Pedido).filter(Pedido.cliente_id == cliente_id).count()
    pedidos_ativos = db.query(Pedido).filter(
        Pedido.cliente_id == cliente_id,
        Pedido.status.in_(["pendente", "confirmado", "preparando", "saiu_entrega"])
    ).count()
    
    # Gastos
    gasto_total = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.cliente_id == cliente_id,
        Pedido.status == "entregue"
    ).scalar() or Decimal(0)
    
    gasto_mes = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.cliente_id == cliente_id,
        Pedido.status == "entregue",
        Pedido.horario >= inicio_mes
    ).scalar() or Decimal(0)
    
    # Pedidos por cozinheiro
    pedidos_por_cozinheiro = {}
    cozinheiros_pedidos = db.query(
        Pedido.cozinheiro_id, 
        Cozinheiro.nome,
        func.count(Pedido.id).label('total')
    ).join(Cozinheiro).filter(
        Pedido.cliente_id == cliente_id
    ).group_by(Pedido.cozinheiro_id).all()
    
    for coz in cozinheiros_pedidos:
        pedidos_por_cozinheiro[coz.nome] = coz.total
    
    # Avaliações
    avaliacoes_feitas = db.query(Pedido).filter(
        Pedido.cliente_id == cliente_id,
        Pedido.avaliacao > 0
    ).count()
    
    # Marmitas mais pedidas
    marmitas_mais_pedidas = db.query(
        Marmita.nome,
        func.count(Pedido.id).label('total')
    ).join(Pedido).filter(
        Pedido.cliente_id == cliente_id
    ).group_by(Marmita.id).order_by(desc('total')).limit(5).all()
    
    return schemas.DashboardCliente(
        total_pedidos=total_pedidos,
        pedidos_ativos=pedidos_ativos,
        gasto_total=gasto_total,
        gasto_mes=gasto_mes,
        pedidos_por_cozinheiro=pedidos_por_cozinheiro,
        avaliacoes_feitas=avaliacoes_feitas,
        marmitas_mais_pedidas=[{"nome": m[0], "total": m[1]} for m in marmitas_mais_pedidas]
    )


@router.get("/dashboard/admin", response_model=schemas.DashboardAdmin)
async def dashboard_admin(
    db: Session = Depends(get_db)
):
    """Dashboard para administrador"""
    
    # Totais gerais
    total_cozinheiros = db.query(Cozinheiro).count()
    total_clientes = db.query(Cliente).count()
    total_pedidos = db.query(Pedido).count()
    
    total_faturamento = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.status == "entregue"
    ).scalar() or Decimal(0)
    
    # Pedidos últimos 7 dias
    ultimos_7_dias = []
    for i in range(6, -1, -1):
        data = datetime.now().replace(hour=0, minute=0, second=0) - timedelta(days=i)
        data_fim = data + timedelta(days=1)
        
        total = db.query(func.count(Pedido.id)).filter(
            Pedido.horario >= data,
            Pedido.horario < data_fim
        ).scalar() or 0
        
        ultimos_7_dias.append({
            "data": data.strftime("%Y-%m-%d"),
            "pedidos": total
        })
    
    # Top cozinheiros
    top_cozinheiros = db.query(
        Cozinheiro.id,
        Cozinheiro.nome,
        func.count(Pedido.id).label('total_pedidos'),
        func.sum(Pedido.val_total).label('faturamento'),
        func.avg(Pedido.avaliacao).label('avaliacao')
    ).join(Pedido).filter(
        Pedido.status == "entregue"
    ).group_by(Cozinheiro.id).order_by(desc('total_pedidos')).limit(5).all()
    
    # Especialidades populares
    especialidades_populares = db.query(
        Especialidade.nome,
        func.count(Pedido.id).label('total')
    ).join(Pedido, Pedido.plano_id == Especialidade.id).group_by(
        Especialidade.id
    ).order_by(desc('total')).limit(5).all()
    
    # Taxa de ocupação (exemplo: pedidos ativos / capacidade)
    pedidos_ativos = db.query(Pedido).filter(
        Pedido.status.in_(["pendente", "confirmado", "preparando"])
    ).count()
    taxa_ocupacao = (pedidos_ativos / 100) * 100 if total_cozinheiros > 0 else 0  # ajuste conforme sua lógica
    
    return schemas.DashboardAdmin(
        total_cozinheiros=total_cozinheiros,
        total_clientes=total_clientes,
        total_pedidos=total_pedidos,
        total_faturamento=total_faturamento,
        pedidos_ultimos_7_dias=ultimos_7_dias,
        top_cozinheiros=[
            {
                "id": c[0],
                "nome": c[1],
                "total_pedidos": c[2],
                "faturamento": c[3],
                "avaliacao": float(c[4] or 0)
            } for c in top_cozinheiros
        ],
        especialidades_populares=[
            {"nome": e[0], "total": e[1]} for e in especialidades_populares
        ],
        taxa_ocupacao=taxa_ocupacao
    )


# ============ ESTATÍSTICAS E RANKINGS ============

@router.get("/estatisticas/pedidos", response_model=schemas.EstatisticasPedido)
async def estatisticas_pedidos(
    periodo: schemas.PeriodoEnum = schemas.PeriodoEnum.MES,
    db: Session = Depends(get_db)
):
    """Estatísticas de pedidos por período"""
    
    hoje = datetime.now()
    if periodo == "day":
        data_inicio = hoje.replace(hour=0, minute=0, second=0)
    elif periodo == "week":
        data_inicio = hoje - timedelta(days=hoje.weekday())
        data_inicio = data_inicio.replace(hour=0, minute=0, second=0)
    elif periodo == "month":
        data_inicio = hoje.replace(day=1, hour=0, minute=0, second=0)
    else:  # year
        data_inicio = hoje.replace(month=1, day=1, hour=0, minute=0, second=0)
    
    pedidos = db.query(Pedido).filter(Pedido.horario >= data_inicio)
    
    total_pedidos = pedidos.count()
    valor_total = db.query(func.sum(Pedido.val_total)).filter(
        Pedido.horario >= data_inicio,
        Pedido.status == "entregue"
    ).scalar() or Decimal(0)
    
    ticket_medio = valor_total / total_pedidos if total_pedidos > 0 else Decimal(0)
    
    # Pedidos por dia
    pedidos_por_dia = {}
    for i in range(30):
        data = data_inicio + timedelta(days=i)
        if data > hoje:
            break
        count = db.query(Pedido).filter(
            Pedido.horario >= data,
            Pedido.horario < data + timedelta(days=1)
        ).count()
        pedidos_por_dia[data.strftime("%Y-%m-%d")] = count
    
    return schemas.EstatisticasPedido(
        periodo=periodo,
        total_pedidos=total_pedidos,
        valor_total=valor_total,
        ticket_medio=ticket_medio,
        pedidos_por_dia=pedidos_por_dia
    )


@router.get("/ranking/cozinheiros", response_model=List[schemas.RankingCozinheiro])
async def ranking_cozinheiros(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Ranking dos melhores cozinheiros"""
    
    ranking = db.query(
        Cozinheiro.id,
        Cozinheiro.nome,
        Especialidade.nome.label('especialidade'),
        func.count(Pedido.id).label('total_pedidos'),
        func.sum(Pedido.val_total).label('faturamento'),
        func.avg(Pedido.avaliacao).label('avaliacao_media')
    ).join(Pedido).join(Especialidade).filter(
        Pedido.status == "entregue"
    ).group_by(Cozinheiro.id).order_by(
        desc('avaliacao_media'),
        desc('total_pedidos')
    ).limit(limit).all()
    
    resultado = []
    for i, coz in enumerate(ranking, 1):
        resultado.append(schemas.RankingCozinheiro(
            cozinheiro_id=coz[0],
            nome=coz[1],
            especialidade=coz[2],
            total_pedidos=coz[3],
            faturamento=coz[4] or Decimal(0),
            avaliacao_media=float(coz[5] or 0),
            posicao=i
        ))
    
    return resultado


# ============ RELATÓRIOS ============

@router.post("/relatorios/vendas", response_model=schemas.RelatorioVendas)
async def relatorio_vendas(
    filtros: schemas.FiltroRelatorio,
    db: Session = Depends(get_db)
):
    """Gera relatório de vendas por período"""
    
    query = db.query(Pedido).filter(
        Pedido.horario >= filtros.data_inicio,
        Pedido.horario <= filtros.data_fim
    )
    
    if filtros.cozinheiro_id:
        query = query.filter(Pedido.cozinheiro_id == filtros.cozinheiro_id)
    if filtros.cliente_id:
        query = query.filter(Pedido.cliente_id == filtros.cliente_id)
    if filtros.status:
        query = query.filter(Pedido.status == filtros.status)
    if filtros.especialidade_id:
        query = query.filter(Pedido.plano_id == filtros.especialidade_id)
    
    pedidos = query.all()
    
    total_vendas = len(pedidos)
    valor_total = sum(p.val_total for p in pedidos if p.status == "entregue")
    valor_medio = valor_total / total_vendas if total_vendas > 0 else Decimal(0)
    
    cozinheiros_ativos = len(set(p.cozinheiro_id for p in pedidos))
    clientes_ativos = len(set(p.cliente_id for p in pedidos))
    
    # Detalhes por dia
    detalhes_por_dia = []
    data_atual = filtros.data_inicio
    while data_atual <= filtros.data_fim:
        pedidos_dia = [p for p in pedidos if p.horario.date() == data_atual.date()]
        detalhes_por_dia.append({
            "data": data_atual.strftime("%Y-%m-%d"),
            "pedidos": len(pedidos_dia),
            "valor": sum(p.val_total for p in pedidos_dia)
        })
        data_atual += timedelta(days=1)
    
    return schemas.RelatorioVendas(
        periodo=f"{filtros.data_inicio.strftime('%Y-%m-%d')} a {filtros.data_fim.strftime('%Y-%m-%d')}",
        total_vendas=total_vendas,
        valor_total=valor_total,
        valor_medio_pedido=valor_medio,
        cozinheiros_ativos=cozinheiros_ativos,
        clientes_ativos=clientes_ativos,
        detalhes_por_dia=detalhes_por_dia
    )


# ============ VIEWS RÁPIDAS ============

@router.get("/avaliacoes/geral", response_model=schemas.ViewAvaliacoes)
async def avaliacoes_gerais(
    db: Session = Depends(get_db)
):
    """Visão geral das avaliações do sistema"""
    
    avaliacoes = db.query(Pedido.avaliacao).filter(Pedido.avaliacao > 0).all()
    
    total_avaliacoes = len(avaliacoes)
    media_geral = sum(a[0] for a in avaliacoes) / total_avaliacoes if total_avaliacoes > 0 else 0
    
    # Distribuição das notas
    distribuicao = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for avaliacao in avaliacoes:
        nota = int(avaliacao[0])
        if nota in distribuicao:
            distribuicao[nota] += 1
    
    # Melhores cozinheiros por avaliação
    melhores_cozinheiros = db.query(
        Cozinheiro.id,
        Cozinheiro.nome,
        func.avg(Pedido.avaliacao).label('media'),
        func.count(Pedido.id).label('total')
    ).join(Pedido).filter(
        Pedido.avaliacao > 0
    ).group_by(Cozinheiro.id).having(
        func.count(Pedido.id) >= 5  # mínimo de avaliações
    ).order_by(desc('media')).limit(10).all()
    
    return schemas.ViewAvaliacoes(
        media_geral=float(media_geral),
        total_avaliacoes=total_avaliacoes,
        distribuicao_notas=distribuicao,
        melhores_cozinheiros=[
            {"id": c[0], "nome": c[1], "media": float(c[2]), "total_avaliacoes": c[3]}
            for c in melhores_cozinheiros
        ]
    )