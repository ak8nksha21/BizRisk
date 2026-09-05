"""part2 worker execution + graph checkpointing

Adds investigation recovery/resume counters + checkpoint namespace, and the
three tables backing the database-backed LangGraph checkpointer.

Revision ID: b7c3e9f21a04
Revises: 9d1f4a7c2b58
Create Date: 2026-09-01 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c3e9f21a04'
down_revision: Union[str, Sequence[str], None] = '9d1f4a7c2b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('investigations', sa.Column('checkpoint_ns', sa.String(length=50), server_default='run-0', nullable=False))
    op.add_column('investigations', sa.Column('recovery_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('investigations', sa.Column('resume_count', sa.Integer(), server_default='0', nullable=False))

    op.create_table(
        'graph_checkpoints',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('thread_id', sa.String(length=200), nullable=False),
        sa.Column('checkpoint_ns', sa.String(length=200), nullable=False),
        sa.Column('checkpoint_id', sa.String(length=200), nullable=False),
        sa.Column('parent_checkpoint_id', sa.String(length=200), nullable=True),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('checkpoint', sa.LargeBinary(), nullable=False),
        sa.Column('metadata_type', sa.String(length=100), nullable=False),
        sa.Column('checkpoint_metadata', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('thread_id', 'checkpoint_ns', 'checkpoint_id', name='uq_graph_checkpoint'),
    )
    op.create_index('ix_graph_checkpoints_thread_ns', 'graph_checkpoints', ['thread_id', 'checkpoint_ns'], unique=False)

    op.create_table(
        'graph_checkpoint_blobs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('thread_id', sa.String(length=200), nullable=False),
        sa.Column('checkpoint_ns', sa.String(length=200), nullable=False),
        sa.Column('channel', sa.String(length=300), nullable=False),
        sa.Column('version', sa.String(length=200), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('blob', sa.LargeBinary(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('thread_id', 'checkpoint_ns', 'channel', 'version', name='uq_graph_checkpoint_blob'),
    )
    op.create_index('ix_graph_checkpoint_blobs_thread_ns', 'graph_checkpoint_blobs', ['thread_id', 'checkpoint_ns'], unique=False)

    op.create_table(
        'graph_checkpoint_writes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('thread_id', sa.String(length=200), nullable=False),
        sa.Column('checkpoint_ns', sa.String(length=200), nullable=False),
        sa.Column('checkpoint_id', sa.String(length=200), nullable=False),
        sa.Column('task_id', sa.String(length=200), nullable=False),
        sa.Column('idx', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=300), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('blob', sa.LargeBinary(), nullable=False),
        sa.Column('task_path', sa.String(length=300), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('thread_id', 'checkpoint_ns', 'checkpoint_id', 'task_id', 'idx', name='uq_graph_checkpoint_write'),
    )
    op.create_index('ix_graph_checkpoint_writes_lookup', 'graph_checkpoint_writes', ['thread_id', 'checkpoint_ns', 'checkpoint_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_graph_checkpoint_writes_lookup', table_name='graph_checkpoint_writes')
    op.drop_table('graph_checkpoint_writes')
    op.drop_index('ix_graph_checkpoint_blobs_thread_ns', table_name='graph_checkpoint_blobs')
    op.drop_table('graph_checkpoint_blobs')
    op.drop_index('ix_graph_checkpoints_thread_ns', table_name='graph_checkpoints')
    op.drop_table('graph_checkpoints')
    op.drop_column('investigations', 'resume_count')
    op.drop_column('investigations', 'recovery_attempts')
    op.drop_column('investigations', 'checkpoint_ns')
