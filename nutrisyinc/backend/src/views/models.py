from database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import relationship

from database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import relationship

class Especialidade(Base):
    __tablename__ = "especialidades"
    
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False, unique=True)
    
    cozinheiros = relationship("Cozinheiro", back_populates="especialidade")
    pedidos = relationship("Pedido", back_populates="plano")

class Cozinheiro(Base):
    __tablename__ = "cozinheiros"
    
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    telefone = Column(String(20), nullable=False, unique=True)
    senha = Column(String(255), nullable=False)
    cep = Column(String(20), nullable=False)
    rua = Column(String(255), nullable=False)
    complemento = Column(String(255))
    numero = Column(Integer, nullable=False)
    especialidade_id = Column(Integer, ForeignKey("especialidades.id"), nullable=False)
    foto_link = Column(String(255))
    sobre_voce = Column(Text)
    avaliacao = Column(Integer, default=0)
    tipo_entrega = Column(String(100))
    
    especialidade = relationship("Especialidade", back_populates="cozinheiros")
    propostas = relationship("Proposta", back_populates="cozinheiro")
    marmitas = relationship("Marmita", back_populates="cozinheiro")
    pedidos = relationship("Pedido", back_populates="cozinheiro")

class Cliente(Base):
    __tablename__ = "cliente"
    
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    telefone = Column(String(20), nullable=False, unique=True)
    senha = Column(String(255), nullable=False)
    cep = Column(String(20), nullable=False)
    rua = Column(String(255), nullable=False)
    complemento = Column(String(255))
    numero = Column(Integer, nullable=False)
    restricao = Column(Text)
    
    pedidos = relationship("Pedido", back_populates="cliente")

class Proposta(Base):
    __tablename__ = "proposta"
    
    id = Column(Integer, primary_key=True)
    valor = Column(DECIMAL(10,2), nullable=False)
    cozinheiro_id = Column(Integer, ForeignKey("cozinheiros.id"), nullable=False)
    status_ = Column(Integer, default=0)
    data_criacao = Column(DateTime, nullable=False)
    data_aceita = Column(DateTime, nullable=True)
    receita_link = Column(String(255))
    
    cozinheiro = relationship("Cozinheiro", back_populates="propostas")
    pedidos = relationship("Pedido", back_populates="proposta")

class Marmita(Base):
    __tablename__ = "marmitas"
    
    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)
    foto = Column(String(255))
    preco = Column(DECIMAL(10,2), nullable=False)
    cozinheiro_id = Column(Integer, ForeignKey("cozinheiros.id"), nullable=False)
    
    cozinheiro = relationship("Cozinheiro", back_populates="marmitas")
    pedidos = relationship("Pedido", back_populates="marmita")

class Pedido(Base):
    __tablename__ = "pedidos"
    
    id = Column(Integer, primary_key=True)
    cozinheiro_id = Column(Integer, ForeignKey("cozinheiros.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=False)
    status = Column(String(100), nullable=False)
    horario = Column(DateTime, nullable=False)
    qtd_marmitas = Column(Integer, nullable=False)
    plano_id = Column(Integer, ForeignKey("especialidades.id"))
    val_total = Column(DECIMAL(10,2), nullable=False)
    avaliacao = Column(Integer, default=0)
    proposta_id = Column(Integer, ForeignKey("proposta.id"))
    marmita_id = Column(Integer, ForeignKey("marmitas.id"))
    
    cozinheiro = relationship("Cozinheiro", back_populates="pedidos")
    cliente = relationship("Cliente", back_populates="pedidos")
    plano = relationship("Especialidade", back_populates="pedidos")
    proposta = relationship("Proposta", back_populates="pedidos")
    marmita = relationship("Marmita", back_populates="pedidos")