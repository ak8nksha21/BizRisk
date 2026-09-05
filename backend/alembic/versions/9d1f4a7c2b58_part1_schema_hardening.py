"""part1 schema hardening

Adds evidence provenance + entity-association columns, research-task planner
parameters, report reproducibility metadata, and lookup indexes.

Revision ID: 9d1f4a7c2b58
Revises: 11a09897a203
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d1f4a7c2b58'
down_revision: Union[str, Sequence[str], None] = '11a09897a203'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('evidences', sa.Column('resolved_entity_id', sa.Uuid(), nullable=True))
    op.add_column('evidences', sa.Column('candidate_entity_id', sa.Uuid(), nullable=True))
    op.add_column('evidences', sa.Column('source_type', sa.String(length=50), nullable=True))
    op.add_column('evidences', sa.Column('supporting_text', sa.Text(), nullable=True))
    op.add_column('evidences', sa.Column('authority_level', sa.Integer(), nullable=True))
    with op.batch_alter_table('evidences', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_evidences_resolved_entity_id', 'entities', ['resolved_entity_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_evidences_candidate_entity_id', 'candidate_entities', ['candidate_entity_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_evidences_investigation_field', 'evidences', ['investigation_id', 'field_name'], unique=False)
    op.create_index('ix_evidences_resolved_entity_id', 'evidences', ['resolved_entity_id'], unique=False)
    op.create_index('ix_evidences_candidate_entity_id', 'evidences', ['candidate_entity_id'], unique=False)

    op.add_column('research_tasks', sa.Column('required_fields', sa.Text(), nullable=True))
    op.add_column('research_tasks', sa.Column('preferred_sources', sa.Text(), nullable=True))
    op.add_column('research_tasks', sa.Column('fallback_sources', sa.Text(), nullable=True))
    op.add_column('research_tasks', sa.Column('priority', sa.Integer(), server_default='1', nullable=True))

    op.add_column('reports', sa.Column('qa_result', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('risk_rules_version', sa.String(length=50), nullable=True))
    op.add_column('reports', sa.Column('prompt_versions', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('model_version', sa.String(length=100), nullable=True))
    op.add_column('reports', sa.Column('evidence_ids', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True))

    op.create_index('ix_risk_signals_investigation_id', 'risk_signals', ['investigation_id'], unique=False)
    op.create_index('ix_investigation_events_investigation_id', 'investigation_events', ['investigation_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_investigation_events_investigation_id', table_name='investigation_events')
    op.drop_index('ix_risk_signals_investigation_id', table_name='risk_signals')

    op.drop_column('reports', 'generated_at')
    op.drop_column('reports', 'evidence_ids')
    op.drop_column('reports', 'model_version')
    op.drop_column('reports', 'prompt_versions')
    op.drop_column('reports', 'risk_rules_version')
    op.drop_column('reports', 'qa_result')

    op.drop_column('research_tasks', 'priority')
    op.drop_column('research_tasks', 'fallback_sources')
    op.drop_column('research_tasks', 'preferred_sources')
    op.drop_column('research_tasks', 'required_fields')

    op.drop_index('ix_evidences_candidate_entity_id', table_name='evidences')
    op.drop_index('ix_evidences_resolved_entity_id', table_name='evidences')
    op.drop_index('ix_evidences_investigation_field', table_name='evidences')
    with op.batch_alter_table('evidences', schema=None) as batch_op:
        batch_op.drop_constraint('fk_evidences_candidate_entity_id', type_='foreignkey')
        batch_op.drop_constraint('fk_evidences_resolved_entity_id', type_='foreignkey')

    op.drop_column('evidences', 'authority_level')
    op.drop_column('evidences', 'supporting_text')
    op.drop_column('evidences', 'source_type')
    op.drop_column('evidences', 'candidate_entity_id')
    op.drop_column('evidences', 'resolved_entity_id')
