# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import models, fields, api


class ProjectTask(models.Model):
    _inherit = "project.task"
    _order = "sequence"

    @api.model
    def _get_moscow_field(self):
        return [('1', 'must'),
                ('2', 'should'),
                ('3', 'could'),
                ('4', 'wont'),
                ('not_set', 'Not Set')]

    @api.model
    def _get_value_field(self):
        return [
            ('0', '0'),
            ('1', '1'),
            ('2', '2'),
            ('3', '3'),
            ('5', '5'),
            ('8', '8'),
            ('13', '13'),
            ('20', '20'),
            ('40', '40'),
            ('100', '100'),
            ('00', 'Not Set'),
        ]

    @api.model
    def _get_risk_field(self):
        return [
            ('0', '0'),
            ('1', '1'),
            ('2', '2'),
            ('3', '3'),
            ('5', '5'),
            ('8', '8'),
            ('13', '13'),
            ('20', '20'),
            ('40', '40'),
            ('100', '100'),
            ('00', 'Not Set'),
        ]

    @api.model
    def _get_kano_field(self):
        return [
            ('excitement', 'Excitement'),
            ('indifferent', 'Indifferent'),
            ('mandatory', 'Mandatory'),
            ('performance', 'Performance'),
            ('questionable', 'Questionable'),
            ('reverse', 'Reverse'),
            ('not_set', 'Not Set'),
        ]

    actor_ids = fields.Many2many(
        comodel_name='project.scrum.actors',
        string='Actor',
    )
    sprint_id = fields.Many2one(
        comodel_name='project.scrum.sprint',
        string='Sprint',
    )
    us_id = fields.Many2one(
        comodel_name='project.scrum.us',
        string='User Stories',
        index=True,
    )
    use_scrum = fields.Boolean(related='project_id.use_scrum', readonly=1)
    current_sprint = fields.Boolean(
        compute='_compute_current_sprint',
        string='Current Sprint',
        search='_search_current_sprint',
    )
    moscow = fields.Selection('_get_moscow_field')
    value = fields.Selection('_get_value_field')
    risk = fields.Selection('_get_risk_field')
    kano = fields.Selection('_get_kano_field')
    color = fields.Integer(related='project_id.color')

    @api.depends('sprint_id')
    def _compute_current_sprint(self):
        for rec in self:
            sprint = self.env['project.scrum.sprint'].get_current_sprint(
                rec.project_id.id)
            if sprint:
                rec.current_sprint = sprint.id == rec.sprint_id.id
            else:
                rec.current_sprint = False

    def _search_current_sprint(self, operator, value):
        project_id = self.env.context.get('default_project_id', None)
        sprint = self.env['project.scrum.sprint'].get_current_sprint(
            project_id)
        return [('sprint_id', '=', sprint and sprint.id or None)]

    @api.model
    def _read_group_sprint_id(self, present_ids, domain, **kwargs):
        project = self.env['project.project'].browse(
            self._resolve_project_id_from_context())
        if project.use_scrum:
            sprints = self.env['project.scrum.sprint'].search(
                [('project_id', '=', project.id)], order='sequence').name_get()
            return sprints, None
        else:
            return [], None

    @api.model
    def _read_group_us_id(self, present_ids, domain, **kwargs):
        project = self.env['project.project'].browse(
            self._resolve_project_id_from_context())
        if project.use_scrum:
            user_stories = self.env['project.scrum.us'].search(
                [('project_id', '=', project.id)], order='sequence').name_get()
            return user_stories, None
        else:
            return [], None

    @api.multi
    def get_formview_id(self):
        if all(self.mapped('use_scrum')):
            return self.env.ref('project_scrum.view_ps_sprint_task_form2').id
        return super().get_formview_id()
