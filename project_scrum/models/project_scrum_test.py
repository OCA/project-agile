# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import models, fields, api


class ProjectScrumTest(models.Model):
    _name = 'project.scrum.test'
    _order = 'sequence_test'
    _description = 'Project Scrum Test'

    name = fields.Char(required=True)
    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project',
        ondelete='cascade',
        index=True,
        required=True,
        track_visibility='onchange',
        change_default=True,
    )
    sprint_id = fields.Many2one(
        comodel_name='project.scrum.sprint',
        string='Sprint',
    )
    user_story_id_test = fields.Many2one(
        comodel_name="project.scrum.us",
        string="User Story",
    )
    description_test = fields.Html(string='Description')
    sequence_test = fields.Integer(string='Sequence', index=True)
    stats_test = fields.Selection([
        ('draft', 'Draft'),
        ('in progress', 'In Progress'),
        ('cancel', 'Cancelled')],
        string='State',
        required=False,
    )
    company_id = fields.Many2one(
        related='project_id.company_id',
    )
    color = fields.Integer(related='project_id.color')

    def _resolve_project_id_from_context(self):
        context = self.env.context
        if type(context.get('default_project_id')) in (int, int):
            return context['default_project_id']
        if isinstance(context.get('default_project_id'), str):
            project_name = context['default_project_id']
            project_ids = self.env['project.project'].name_search(
                name=project_name)
            if len(project_ids) == 1:
                return project_ids[0][0]
        return None

    @api.model
    def _read_group_us_id(self, present_ids, domain, **kwargs):
        project_id = self._resolve_project_id_from_context()
        user_stories = self.env['project.scrum.us'].search(
            [('project_id', '=', project_id)]).name_get()
        return user_stories, None

    _group_by_full = {
        'user_story_id_test': _read_group_us_id,
        }
