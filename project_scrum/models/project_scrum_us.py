# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import models, fields, api


class ProjectScrumUs(models.Model):
    _name = 'project.scrum.us'
    _description = 'Project Scrum Use Stories'
    _order = 'reference'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    @api.model
    def create(self, vals):
        vals['reference'] = self.env['ir.sequence'].next_by_code('user.story')
        return super().create(vals)

    @api.model
    def _get_moscow_field(self):
        return self.env['project.task']._get_moscow_field()

    @api.model
    def _get_value_field(self):
        return self.env['project.task']._get_value_field()

    @api.model
    def _get_risk_field(self):
        return self.env['project.task']._get_risk_field()

    @api.model
    def _get_kano_field(self):
        return self.env['project.task']._get_kano_field()

    name = fields.Char(string='User Story', required=True)
    color = fields.Integer(related='project_id.color')
    description = fields.Html(string='Description',)
    actor_ids = fields.Many2many(
        comodel_name='project.scrum.actors',
        string='Actor',
    )
    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project',
        ondelete='set null',
        index=True,
        track_visibility='onchange',
        change_default=True,
        required=True,
    )
    sprint_ids = fields.Many2many(
        comodel_name='project.scrum.sprint',
        string='Sprint',
        group_expand='_read_group_sprint_id',
    )
    task_ids = fields.One2many(
        comodel_name='project.task',
        inverse_name='us_id',
    )
    task_test_ids = fields.One2many(
        comodel_name='project.scrum.test',
        inverse_name='user_story_id_test',
    )
    task_count = fields.Integer(compute='_compute_task_count', store=True)
    test_ids = fields.One2many(
        comodel_name='project.scrum.test',
        inverse_name='user_story_id_test',
    )
    test_count = fields.Integer(compute='_compute_test_count', store=True)
    sequence = fields.Integer()
    company_id = fields.Many2one(
        related='project_id.company_id',
        store=True
    )
    moscow = fields.Selection('_get_moscow_field', string='Moscow')
    value = fields.Selection('_get_value_field', string='Value')
    risk = fields.Selection('_get_risk_field', string='Risk')
    kano = fields.Selection('_get_kano_field', string='Kano')
    reference = fields.Char(
        'Number',
        index=True,
        readonly=True,
        copy=False,
        default='/',
    )
    kanban_state = fields.Selection([
        ('normal', 'Mark as impeded'),
        ('blocked', 'Mark as waiting'),
        ('done', 'Mark item as defined and ready for implementation')],
        'Kanban State',
        default='blocked',
    )

    @api.depends("task_ids")
    def _compute_task_count(self):
        for p in self:
            p.task_count = len(p.task_ids)

    @api.depends("test_ids")
    def _compute_test_count(self):
        for p in self:
            p.test_count = len(p.test_ids)

    def _resolve_project_id_from_context(self):
        """ Returns ID of project based on the value of 'default_project_id'
            context key, or None if it cannot be resolved to a single
            project.
        """
        context = self.env.context
        project_project_model = self.env['project.project']
        if type(context.get('default_project_id')) in (int, int):
            return context['default_project_id']
        if isinstance(context.get('default_project_id'), str):
            project_name = context['default_project_id']
            project_ids = project_project_model.with_context(context)
            project_ids = project_ids.name_search(project_name, operator='=')
            if not project_ids:
                project_ids = project_ids.name_search(
                    project_name,
                    operator='=ilike',
                )
            if not project_ids:
                project_ids.name_search(name=project_name)
            if len(project_ids) == 1:
                return project_ids[0][0]
        return None

    @api.model
    def _read_group_sprint_id(self, present_ids, domain, **kwargs):
        project_id = self._resolve_project_id_from_context()
        sprints = self.env['project.scrum.sprint'].search(
            [('project_id', '=', project_id)], order='sequence').name_get()
        return sprints, None
