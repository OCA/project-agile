# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, tools, _


class ProjectType(models.Model):
    _name = "project.type"
    _inherit = ['project.agile.code_item']

    stage_ids = fields.Many2many(
        comodel_name='project.task.type',
        relation='project_type_task_stage_rel',
        column1='project_id',
        column2='stage_id',
        string='Tasks Stages'
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        string='Workflow',
        help="Workflow which will be used as a default project workflow",
    )

    task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        relation="project_type_task_type_rel",
        column1="project_type_id",
        column2="task_type_id",
        string="Task Types",
    )

    default_task_type_id = fields.Many2one(
        comodel_name='project.task.type2',
        string='Default Task Type',
    )

    _sql_constraints = [
        ('name_unique',
         'UNIQUE(name)',
         "The name must be unique"),
    ]

    @api.multi
    def has_task_type(self, type_id):
        self.ensure_one()
        for task_type in self.task_type_ids:
            if task_type.id == type_id:
                return True
        return False


class Project(models.Model):
    _name = 'project.project'
    _inherit = ['project.project', 'project.agile.mixin.id_search']

    @api.model
    def _get_default_type_id(self, ):
        return self.env.ref_id("project_agile.project_type_software")

    @api.model
    def _get_default_workflow_id(self):
        type_id = self._get_default_type_id()

        project_type = False
        if type_id:
            project_type = self.env['project.type'].browse(type_id)

        workflow_id = False
        if project_type and project_type.workflow_id:
            workflow_id = project_type.workflow_id.id
        return workflow_id

    @api.model
    def _set_default_project_type_id(self):
        project_type = self.env['project.type'].browse(
            self._get_default_type_id()
        )

        workflow_id = project_type.workflow_id

        self.with_context(active_test=False, no_workflow=False) \
            .search([]) \
            .write(dict(type_id=project_type.id, workflow_id=workflow_id.id))

    type_id = fields.Many2one(
        comodel_name="project.type",
        string="Project type",
        required=True,
        ondelete="restrict",
        default=lambda s: s._get_default_type_id(),
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        default=lambda s: s._get_default_workflow_id(),
    )

    default_task_type_id = fields.Many2one(
        comodel_name='project.task.type2',
        related='type_id.default_task_type_id',
        string='Default Task Type',
        readonly=True,
    )

    agile_enabled = fields.Boolean(
        string='Use Agile',
        help='If checked project will be enabled for Agile management',
    )

    agile_method = fields.Selection(
        selection=[],
        string='Agile Method',
    )

    board_ids = fields.Many2many(
        comodel_name="project.agile.board",
        relation="board_project_rel",
        column1="project_id",
        column2="board_id",
        string="Boards"
    )

    boards_count = fields.Integer(
        string="Board Count",
        compute="_compute_board_count"
    )

    team_ids = fields.Many2many(
        comodel_name="project.agile.team",
        relation="project_project_agile_team_rel",
        column1="project_id",
        column2="team_id",
        string="Agile Teams",
    )

    user_story_count = fields.Integer(
        string='User Story Count',
        compute="_compute_user_story_count"
    )

    epics_count = fields.Integer(
        string='Epics Count',
        compute="_compute_epics_count"
    )

    todo_estimation = fields.Integer(
        string="Todo estimation",
        compute="_compute_estimations",
    )
    in_progress_estimation = fields.Integer(
        string="In progress estimation",
        compute="_compute_estimations",
    )
    done_estimation = fields.Integer(
        string="Done estimation",
        compute="_compute_estimations",
    )

    # image: all image fields are base64 encoded and PIL-supported
    image = fields.Binary(
        "Image",
        attachment=True,
        help="This field holds the image used as image for the project, "
             "limited to 1024x1024px."
    )

    image_medium = fields.Binary(
        "Medium-sized image",
        compute='_compute_images',
        inverse='_inverse_image_medium',
        store=True,
        attachment=True,
        help="Medium-sized image of the project. It is automatically "
             "resized as a 128x128px image, with aspect ratio preserved,"
             "only when the image exceeds one of those sizes. "
             "Use this field in form views or some kanban views."
    )

    image_small = fields.Binary(
        "Small-sized image",
        compute='_compute_images',
        inverse='_inverse_image_small',
        store=True,
        attachment=True,
        help="Small-sized image of the project. It is automatically "
             "resized as a 64x64px image, with aspect ratio preserved. "
             "Use this field anywhere a small image is required."
    )

    @api.multi
    def _compute_board_count(self):
        for record in self:
            if record.agile_enabled:
                record.boards_count = len(record.board_ids)

    @api.multi
    def _compute_user_story_count(self):
        user_story_type = self.env.ref('project_agile.project_task_type_story')
        for prj in self:
            prj.user_story_count = self.env['project.task'].search_count([
                ('project_id', '=', prj.id),
                ('type_id', '=', user_story_type.id)
            ])

    @api.multi
    def _compute_epics_count(self):
        epics_type = self.env.ref('project_agile.project_task_type_epic')
        for prj in self:
            prj.epics_count = self.env['project.task'].search_count([
                ('project_id', '=', prj.id),
                ('type_id', '=', epics_type.id)
            ])

    @api.multi
    def _compute_estimations(self):
        for record in self:
            o = {"todo": 0, "in_progress": 0, "done": 0}

            if record.agile_enabled:
                for task in self.env["project.task"].search([
                    ('project_id', '=', record.id)
                ]):
                    if task.wkf_state_type:
                        o[task.wkf_state_type] += task.story_points or 0
            for key, value in o.items():
                record["%s_estimation" % (key,)] = value

    @api.depends('image')
    def _compute_images(self):
        for rec in self:
            rec.image_medium = tools.image_resize_image_medium(
                rec.image, avoid_if_small=True
            )
            rec.image_small = tools.image_resize_image_small(rec.image)

    def _inverse_image_medium(self):
        for rec in self:
            rec.image = tools.image_resize_image_big(rec.image_medium)

    def _inverse_image_small(self):
        for rec in self:
            rec.image = tools.image_resize_image_big(rec.image_small)

    @api.onchange('type_id')
    def _onchange_type(self):
        if self.type_id:
            if self.env.context.get('apply_stages', False) and \
                    self.type_id.stage_ids:
                self.type_ids = [x.id for x in self.type_id.stage_ids]

            if isinstance(self.id, models.NewId):
                self.workflow_id = self.type_id.workflow_id.id
        else:
            self.type_ids = []

    @api.onchange("agile_enabled")
    def _onchange_agile_enabled(self):
        if self.agile_enabled:
            self.allow_workflow = True

    # CRUD Overrides
    @api.model
    @api.returns('self', lambda value: value.id)
    def create(self, vals):
        # Activating agile will automatically activate workflow as well
        if vals.get('agile_enabled', False):
            vals['allow_workflow'] = True

        new = super(Project, self).create(vals)
        new.subtask_project_id = new.id

        if new.agile_enabled:
            board = self.env['project.agile.board'].search([
                ('type', '=', new.agile_method),
                ('is_default', '=', True)
            ])

            if board:
                new.write({'board_ids': [(6, 0, [board.id])]})

        return new

    @api.multi
    def write(self, vals):
        self._fix_type_ids(vals)

        if vals.get('agile_enabled', True):
            vals['allow_workflow'] = True

        return super(Project, self).write(vals)

    def _fix_type_ids(self, vals):
        if 'type_ids' not in vals:
            return

        type_ids = vals.get('type_ids', [])

        new_type_ids = []
        for type_id in type_ids:
            if type_id[0] in [1]:
                new_type_ids.append(type_id[1])
            elif type_id[0] == 6:
                new_type_ids.extend(type_id[2])

        vals['type_ids'] = [(6, 0, new_type_ids)]

    @api.multi
    def open_board_tree_view(self):
        self.ensure_one()

        if not self.agile_enabled:
            return

        domain = [('project_ids', 'in', [self.id])]

        return {
            'name': 'Agile Boards',
            'domain': domain,
            'res_model': 'project.agile.board',
            'type': 'ir.actions.act_window',
            'view_id': False,
            'view_mode': 'tree,form',
            'view_type': 'form',
            'limit': 80
        }

    @api.multi
    def open_user_stories(self):
        self.ensure_one()
        action = self.env.ref_action(
            "project.act_project_project_2_project_task_all"
        )

        type = self.env.ref(
            'project_agile.project_task_type_story'
        )

        action['display_name'] = _("User Stories")
        action['context'] = {
            'group_by': 'stage_id',
            'search_default_project_id': [self.id],
            'default_project_id': self.id,
            'search_default_type_id': type.id,
            'default_type_id': type.id,
        }

        if self.agile_enabled:
            del action['context']['group_by']
            action['view_mode'] = 'tree, form, calendar, pivot, graph'
            views = []
            for view in action.get('views'):
                if view[1] == 'kanban':
                    continue
                views.append(view)
            action['views'] = views

        return action

    @api.multi
    def open_epics(self):
        self.ensure_one()
        action = self.env.ref_action(
            "project.act_project_project_2_project_task_all"
        )

        type = self.env.ref('project_agile.project_task_type_epic')
        action['display_name'] = _("Epics")
        action['context'] = {
            'group_by': 'stage_id',
            'search_default_project_id': [self.id],
            'default_project_id': self.id,
            'search_default_type_id': type.id,
            'default_type_id': type.id,
        }

        if self.agile_enabled:
            del action['context']['group_by']
            action['view_mode'] = 'tree, form, calendar, pivot, graph'
            views = []
            for view in action.get('views'):
                if view[1] == 'kanban':
                    continue
                views.append(view)
            action['views'] = views

        return action

    @api.multi
    def open_tasks(self):
        self.ensure_one()

        action = self.env.ref_action(
            "project.act_project_project_2_project_task_all"
        )

        action['context'] = {
            'group_by': 'stage_id',
            'search_default_project_id': [self.id],
            'default_project_id': self.id,
        }

        if self.agile_enabled:
            del action['context']['group_by']
            action['view_mode'] = 'tree, form, calendar, pivot, graph'
            views = []
            for view in action.get('views'):
                if view[1] == 'kanban':
                    continue
                views.append(view)
            action['views'] = views

        return action
