from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum

# ============ ENUMS ============
class PeriodoEnum(str, Enum):
    DIA = "day"
    SEMANA = "week"
    MES = "month"
    ANO = "year"

class StatusPedidoEnum(str, Enum):
    PENDENTE = "pendente"
    CONFIRMADO = "confirmado"
    PREPARANDO = "preparando"
    SAIU_ENTREGA = "saiu_entrega"
    ENTREGUE = "entregue"
    CANCELADO = "cancelado"

# ============ DASHBOARD PRINCIPAL ============
class DashboardCozinheiro(BaseModel):
    """Dashboard do cozinheiro"""
    total_pedidos: int
    pedidos_hoje: int
    pedidos_semana: int
    faturamento_total: Decimal
    faturamento_mes: Decimal
    avaliacao_media: float
    total_marmitas: int
    total_propostas: int
    propostas_pendentes: int
    pedidos_por_status: Dict[str, int]

class DashboardCliente(BaseModel):
    """Dashboard do cliente"""
    total_pedidos: int
    pedidos_ativos: int
    gasto_total: Decimal
    gasto_mes: Decimal
    pedidos_por_cozinheiro: Dict[str, int]
    avaliacoes_feitas: int
    marmitas_mais_pedidas: List[Dict[str, Any]]

class DashboardAdmin(BaseModel):
    """Dashboard do administrador"""
    total_cozinheiros: int
    total_clientes: int
    total_pedidos: int
    total_faturamento: Decimal
    pedidos_ultimos_7_dias: List[Dict[str, Any]]
    top_cozinheiros: List[Dict[str, Any]]
    especialidades_populares: List[Dict[str, Any]]
    taxa_ocupacao: float

# ============ ESTATÍSTICAS ============
class EstatisticasPedido(BaseModel):
    periodo: str
    total_pedidos: int
    valor_total: Decimal
    ticket_medio: Decimal
    pedidos_por_dia: Dict[str, int]

class RankingCozinheiro(BaseModel):
    cozinheiro_id: int
    nome: str
    especialidade: str
    total_pedidos: int
    faturamento: Decimal
    avaliacao_media: float
    posicao: int

class AnaliseVendas(BaseModel):
    vendas_por_especialidade: Dict[str, Decimal]
    horarios_pico: Dict[int, int]
    dias_mais_vendem: Dict[str, int]
    produtos_mais_vendidos: List[Dict[str, Any]]

# ============ RELATÓRIOS ============
class FiltroRelatorio(BaseModel):
    data_inicio: datetime
    data_fim: datetime
    cozinheiro_id: Optional[int] = None
    cliente_id: Optional[int] = None
    status: Optional[StatusPedidoEnum] = None
    especialidade_id: Optional[int] = None

class RelatorioVendas(BaseModel):
    periodo: str
    total_vendas: int
    valor_total: Decimal
    valor_medio_pedido: Decimal
    cozinheiros_ativos: int
    clientes_ativos: int
    detalhes_por_dia: List[Dict[str, Any]]

class RelatorioCozinheiro(BaseModel):
    cozinheiro_id: int
    nome: str
    periodo: str
    total_pedidos: int
    faturamento: Decimal
    avaliacao_media: float
    pedidos_finalizados: int
    taxa_entrega: float
    feedbacks: List[str]

# ============ VIEWS DE ANÁLISE ============
class ViewPedidosPorPeriodo(BaseModel):
    data: datetime
    quantidade: int
    valor_total: Decimal

class ViewAvaliacoes(BaseModel):
    media_geral: float
    total_avaliacoes: int
    distribuicao_notas: Dict[int, int]
    melhores_cozinheiros: List[Dict[str, Any]]

class ViewPerformance(BaseModel):
    cozinheiro_id: int
    nome: str
    tempo_medio_entrega: float  # em minutos
    taxa_sucesso: float  # porcentagem
    cancelamentos: int
    pedidos_realizados: int