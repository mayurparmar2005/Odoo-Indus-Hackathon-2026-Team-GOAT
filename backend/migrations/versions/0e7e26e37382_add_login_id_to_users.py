"""add login_id to users

Revision ID: 0e7e26e37382
Revises: ce04fcf8e62e
Create Date: 2026-03-14 13:39:17.122812

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision = '0e7e26e37382'
down_revision = 'ce04fcf8e62e'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add column as NULLABLE first so existing rows don't violate NOT NULL
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('login_id', sa.String(length=12), nullable=True))

    # Step 2: Back-fill existing rows — derive login_id from the email prefix
    users_table = table('users',
        column('id', sa.Integer),
        column('email', sa.String),
        column('login_id', sa.String),
    )
    conn = op.get_bind()
    results = conn.execute(sa.select(users_table.c.id, users_table.c.email)).fetchall()
    for row_id, email in results:
        base = email.split('@')[0][:12]
        placeholder = (base if len(base) >= 6 else base + '_user')[:12]
        conn.execute(
            users_table.update()
            .where(users_table.c.id == row_id)
            .values(login_id=placeholder)
        )

    # Step 3: Now enforce NOT NULL and add the unique constraint
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('login_id', nullable=False)
        batch_op.create_unique_constraint('uq_users_login_id', ['login_id'])


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_login_id', type_='unique')
        batch_op.drop_column('login_id')
