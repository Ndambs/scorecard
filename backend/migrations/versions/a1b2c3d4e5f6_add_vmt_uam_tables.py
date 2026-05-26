"""add_vmt_uam_tables

Revision ID: a1b2c3d4e5f6
Revises: <paste_your_current_head_revision_here>
Create Date: 2026-05-25 00:00:00.000000

Instructions
------------
1. Replace the `down_revision` value with the output of:
       alembic heads
2. Run:
       alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision    = 'a1b2c3d4e5f6'
down_revision = None   # ← replace with your current head revision ID
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── vmt_uam_reports ──────────────────────────────────────────────────
    op.create_table(
        'vmt_uam_reports',
        sa.Column('id',           sa.Integer(),  primary_key=True, index=True),
        sa.Column('period_start', sa.Date(),     nullable=False),
        sa.Column('period_end',   sa.Date(),     nullable=False),
        sa.Column('notes',        sa.Text(),     server_default=''),
        sa.Column('is_published', sa.Boolean(),  server_default='0'),
        sa.Column('created_by',   sa.String(120), server_default='system'),
        sa.Column('created_at',   sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at',   sa.DateTime(), server_default=sa.func.now(),
                  onupdate=sa.func.now()),

        # Queue totals
        sa.Column('q_logged',        sa.Integer(), server_default='0'),
        sa.Column('q_open_sla',      sa.Integer(), server_default='0'),
        sa.Column('q_open_breach',   sa.Integer(), server_default='0'),
        sa.Column('q_open_blank',    sa.Integer(), server_default='0'),
        sa.Column('q_pending',       sa.Integer(), server_default='0'),
        sa.Column('q_total_open',    sa.Integer(), server_default='0'),
        sa.Column('q_closed_sla',    sa.Integer(), server_default='0'),
        sa.Column('q_closed_breach', sa.Integer(), server_default='0'),
        sa.Column('q_closed_blank',  sa.Integer(), server_default='0'),
        sa.Column('q_total_closed',  sa.Integer(), server_default='0'),
        sa.Column('q_sla_rate',      sa.Float(),   server_default='0'),

        # Computed analytics (persisted for trend queries)
        sa.Column('resolution_efficiency', sa.Float(), server_default='0'),
        sa.Column('throughput_ratio',      sa.Float(), server_default='0'),
        sa.Column('breach_rate_closed',    sa.Float(), server_default='0'),
        sa.Column('pending_share',         sa.Float(), server_default='0'),
        sa.Column('open_breach_rate',      sa.Float(), server_default='0'),
        sa.Column('backlog_health_score',  sa.Float(), server_default='0'),
    )

    # ── vmt_uam_member_stats ─────────────────────────────────────────────
    op.create_table(
        'vmt_uam_member_stats',
        sa.Column('id',        sa.Integer(), primary_key=True, index=True),
        sa.Column('report_id', sa.Integer(),
                  sa.ForeignKey('vmt_uam_reports.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('agent_id',   sa.String(40),  nullable=False),
        sa.Column('agent_name', sa.String(120), nullable=False),

        sa.Column('open_sla',      sa.Integer(), server_default='0'),
        sa.Column('open_breach',   sa.Integer(), server_default='0'),
        sa.Column('open_blank',    sa.Integer(), server_default='0'),
        sa.Column('pending',       sa.Integer(), server_default='0'),
        sa.Column('closed_sla',    sa.Integer(), server_default='0'),
        sa.Column('closed_breach', sa.Integer(), server_default='0'),
        sa.Column('closed_blank',  sa.Integer(), server_default='0'),

        sa.Column('total_closed',       sa.Integer(), server_default='0'),
        sa.Column('total_open',         sa.Integer(), server_default='0'),
        sa.Column('agent_sla_rate',     sa.Float(),   server_default='0'),
        sa.Column('productivity_score', sa.Float(),   server_default='0'),
    )

    # Indexes for common query patterns
    op.create_index('ix_vmt_reports_period_start',
                    'vmt_uam_reports', ['period_start'])
    op.create_index('ix_vmt_member_stats_report_id',
                    'vmt_uam_member_stats', ['report_id'])
    op.create_index('ix_vmt_member_stats_agent_id',
                    'vmt_uam_member_stats', ['agent_id'])


def downgrade() -> None:
    op.drop_index('ix_vmt_member_stats_agent_id',  table_name='vmt_uam_member_stats')
    op.drop_index('ix_vmt_member_stats_report_id', table_name='vmt_uam_member_stats')
    op.drop_index('ix_vmt_reports_period_start',   table_name='vmt_uam_reports')
    op.drop_table('vmt_uam_member_stats')
    op.drop_table('vmt_uam_reports')
