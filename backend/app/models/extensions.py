"""
Re-export db so models can import from .extensions without
needing to go up two levels to ..extensions each time.
This avoids circular import issues when models import each other.
"""
from ..extensions import db

__all__ = ['db']
