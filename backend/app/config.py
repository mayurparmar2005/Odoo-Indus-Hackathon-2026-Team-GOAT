import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-prod')
    JWT_ACCESS_TOKEN_EXPIRES = 900        # 15 min
    JWT_REFRESH_TOKEN_EXPIRES = 604800    # 7 days

    MAIL_SERVER   = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT     = int(os.getenv('MAIL_PORT', 465))
    MAIL_USE_SSL  = os.getenv('MAIL_USE_SSL', 'True').lower() == 'true'
    MAIL_USE_TLS  = os.getenv('MAIL_USE_TLS', 'False').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@coreinventory.com')

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/coreinventory_db'
    )

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

config_map = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}
