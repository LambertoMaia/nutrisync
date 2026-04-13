from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Banco de dados MySQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "1234"
    DB_NAME: str = "prato_ideal"

    # JWT
    SECRET_KEY: str = "chave_segura_prato_ideal_1234"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Mercado Pago
    MP_ACCESS_TOKEN: str = ""
    MP_PUBLIC_KEY: str = ""

    # App
    DEBUG: bool = False
    APP_NAME: str = "NutriSync API"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()