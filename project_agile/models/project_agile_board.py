# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Board(models.Model):
    _name = 'project.agile.board'
    _inherit = ['project.agile.mixin.id_search']
    _description = "Agile Board"

    name = fields.Char(agile=True)
    description = fields.Char(agile=True)

    type = fields.Selection(
        selection=[],
        agile=True,
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        domain="[('state', '=', 'live')]",
        string='Workflow',
        required=True,
        index=True,
        ondelete="restrict",
    )

    project_ids = fields.Many2many(
        comodel_name="project.project",
        relation="board_project_rel",
        column1="board_id",
        column2="project_id",
        string="Projects",
        agile=True,
    )

    column_ids = fields.One2many(
        comodel_name="project.agile.board.column",
        inverse_name="board_id",
        string="Columns",
        required=False,
        agile=True,
    )

    status_ids = fields.One2many(
        comodel_name="project.agile.board.column.status",
        inverse_name="board_id",
        string="Statuses",
        readonly=True,
    )

    is_default = fields.Boolean(
        string='Default?',
        default=False,
    )

    unmapped_state_ids = fields.One2many(
        comodel_name='project.workflow.state',
        compute="_compute_unmapped_state_ids",
        readonly=True,
        agile=True,
    )
    unmapped_task_stage_ids = fields.One2many(
        comodel_name='project.task.type',
        compute="_compute_unmapped_task_stage_ids",
        readonly=True,
        agile=True,
    )

    report_ids = fields.One2many(
        comodel_name='project.agile.board.report',
        compute="_compute_report_ids",
    )

    task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        relation="project_agile_board_task_type_rel",
        column1="board_id",
        column2="type_id",
        string="Backlog Task Types",
        agile=True,
        help='List of available task types for this board.'
             'If left empty task types from registered projects will be used',
    )

    visibility = fields.Selection(
        selection=[('global', 'Global'), ('team', 'Team'), ('user', 'User')],
        default='global',
        required=True,
        string='Visibility'
    )

    team_id = fields.Many2one(
        comodel_name='project.agile.team',
        string='Team',
        help='Team which owns this board'
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        help='User which owns this board',
    )

    @api.multi
    def _compute_report_ids(self):
        for rec in self:
            rec.project_ids = self.env['project.agile.board.report']\
                                  .search([('type', '=', rec.type)]).ids or []

    @api.multi
    def get_mapped_states(self):
        self.ensure_one()
        mapped_states = []
        for column in self.column_ids:
            mapped_states.extend([x.state_id.id for x in column.status_ids])
        return mapped_states

    @api.multi
    def _compute_unmapped_task_stage_ids(self):
        for record in self:
            record.unmapped_task_stage_ids = [
                x.stage_id.id for x in record.unmapped_state_ids
            ]

    @api.multi
    def _compute_unmapped_state_ids(self):
        for record in self:
            mapped_states = set(record.get_mapped_states())
            workflow_states = set(record.workflow_id.state_ids.ids)
            diff = workflow_states - mapped_states

            if diff:
                record.unmapped_state_ids = list(diff)
            else:
                record.unmapped_state_ids = []

    @api.constrains('type')
    def _constraint_type_projects(self):
        for project in self.project_ids:
            if project.agile_method != self.type:
                raise exceptions.ValidationError(_(
                    "Agile method on assigned projects does not match "
                    "selected board type!"
                ))

    @api.multi
    def create_task_domain(self):
        self.ensure_one()
        return [("project_id", "in", self.project_ids.ids)]

    @api.multi
    def task_tree_view(self):
        self.ensure_one()

        type_story = self.env.ref("project_agile.project_task_type_story")
        default_filter = [
            ("sprint_id", "=", False),
            ("type_id", "=", type_story.id)
        ]

        domain = self.create_task_domain() + default_filter
        ctx = {
            'default_res_model': self._name,
            'default_res_id': self.id,
        }
        return {
            'name': 'Tasks',
            'domain': domain,
            'res_model': 'project.task',
            'type': 'ir.actions.act_window',
            'view_id': False,
            'view_mode': 'tree,form',
            'view_type': 'form',
            'help': '''<p class="oe_view_nocontent_create">
                    Some help, change to appropriate
                </p>''',
            'limit': 80,
            'context': ctx,
        }

    @api.multi
    def declare_default(self):
        self.ensure_one()
        self.search([
            ('workflow_id', '=', self.workflow_id.id),
            ('type', '=', self.type),
            ('is_default', '=', True)
        ]).write({'is_default': False})

        self.is_default = True

    @api.multi
    def export_board(self):
        self.ensure_one()
        wizard = self.env['project.agile.board.export.wizard'].create({
            'board_id': self.id
        })
        return wizard.button_export()

    @api.multi
    def open_in_odoo_agile(self):
        self.ensure_one()
        url = "/agile/web#page=board&board=%s&view=%s" % (self.id, self.type)
        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': url
        }


class Column(models.Model):
    _name = 'project.agile.board.column'
    _description = "Agile Board Column"
    _order = 'order'

    name = fields.Char()
    board_id = fields.Many2one(
        comodel_name="project.agile.board",
        string="Board",
        ondelete='cascade'
    )

    status_ids = fields.One2many(
        comodel_name="project.agile.board.column.status",
        inverse_name="column_id",
        string="Statuses",
        required=True
    )

    order = fields.Float(required=False, )
    min = fields.Integer(
        "Min",
        help="The minimum number of issues in this column"
    )

    max = fields.Integer(
        "Max",
        help="The maximum number of issues int this column"
    )

    min_max_visible = fields.Boolean(
        compute="_compute_min_max_visible"
    )

    notification_level = fields.Selection(
        selection=[('warning', 'Warning'), ('error', 'Error')],
        string='Notification Level',
        help="Level of notification when the maximum number of issues is "
             "exceeded!"
    )

    workflow_id = fields.Many2one(
        related="board_id.workflow_id",
        comodel_name='project.workflow',
        string='Workflow',
        readonly=True,
        store=True,
    )

    _sql_constraints = [
        ('name_unique', 'UNIQUE(board_id,name)',
         "The name of the column must be unique per board"),
    ]

    @api.multi
    @api.depends("board_id.type")
    def _compute_min_max_visible(self):
        min_max_types = self._min_max_available_for_types()
        for column in self:
            column.min_max_visible = column.board_id.type in min_max_types

    def _min_max_available_for_types(self):
        return []


class ColumnStatus(models.Model):
    _name = 'project.agile.board.column.status'
    _description = "Agile Board Column Status"

    name = fields.Char(
        related="state_id.name",
        readonly=True
    )

    column_id = fields.Many2one(
        comodel_name="project.agile.board.column",
        string="Column",
        required=False,
        ondelete='cascade'
    )

    board_id = fields.Many2one(
        comodel_name="project.agile.board",
        string="Board",
        related="column_id.board_id",
        readonly=True,
        store=True,
    )

    state_id = fields.Many2one(
        comodel_name='project.workflow.state',
        domain="[('workflow_id', '=', workflow_id)]",
        string='Name',
        oldname='status_id',
        required=True,
    )

    stage_id = fields.Many2one(
        comodel_name="project.task.type",
        string="Name",
        oldname='state_id',
        related="state_id.stage_id",
    )

    order = fields.Float(
        string='Order',
        required=False
    )

    workflow_id = fields.Many2one(
        related="column_id.board_id.workflow_id",
        comodel_name='project.workflow',
        domain="[('state', '=', 'live')]",
        string='Workflow',
        readonly=True,
        store=True,
    )

    workflow_stage_ids = fields.Many2many(
        comodel_name='project.task.type',
        related='workflow_id.stage_ids',
        readonly=True
    )

    _sql_constraints = [
        ('stage_unique', 'UNIQUE(board_id, state_id)',
         "Column state must be unique per board!"),
    ]

    @api.multi
    @api.onchange("workflow_id")
    def calculate_workflow_stage_ids(self):
        for record in self:
            record.workflow_stage_ids = [
                x.id for x in self.workflow_id.stage_ids
            ]

    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        if args is None:
            args = []
        if 'filter_statuses_in_column' in self.env.context:
            columns = self.env.context.get('filter_statuses_in_column', [])
            ids = [x[1] for x in columns]
            args.append(('id', 'in', ids))
        return super(ColumnStatus, self)\
            .name_search(name, args=args, operator=operator, limit=limit)
