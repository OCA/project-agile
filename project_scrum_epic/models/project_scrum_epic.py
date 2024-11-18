#!/usr/bin/env python3
# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
from odoo import api, fields, models


class ProjectScrumEpic(models.Model):
    _name = "project.scrum.epic"
    _description = "Project Scrum Epic"
    _order = "reference"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    @api.model
    def create(self, vals):
        vals["reference"] = self.env["ir.sequence"].next_by_code("scrum.epic")
        return super().create(vals)

    name = fields.Char(string="Epic", required=True)
    color = fields.Integer(related="project_id.color")
    description = fields.Html()
    project_id = fields.Many2one(
        comodel_name="project.project",
        string="Project",
        ondelete="restrict",
        index=True,
        tracking=True,
        change_default=True,
        required=True,
    )
    sprint_ids = fields.Many2many(
        comodel_name="project.scrum.sprint",
        string="Sprint",
        group_expand="_read_group_sprint_id",
    )
    task_ids = fields.One2many(
        comodel_name="project.task",
        inverse_name="epic_id",
    )
    task_count = fields.Integer(compute="_compute_task_count", store=True)
    sequence = fields.Integer()
    company_id = fields.Many2one(related="project_id.company_id", store=True)
    reference = fields.Char(
        string="Number",
        index=True,
        readonly=True,
        copy=False,
        default="/",
    )
    kanban_state = fields.Selection(
        selection=[
            ("normal", "Mark as impeded"),
            ("blocked", "Mark as waiting"),
            ("done", "Mark item as defined and ready for implementation"),
        ],
        default="blocked",
    )
    priority = fields.Selection(
        selection=[
            ("0", "Low"),
            ("1", "Medium"),
            ("2", "High"),
            ("3", "Highest"),
        ],
        required=True,
        default="1",
    )

    @api.depends("task_ids")
    def _compute_task_count(self):
        for p in self:
            p.task_count = len(p.task_ids)

    def _resolve_project_id_from_context(self):
        """Returns ID of project based on the value of 'default_project_id'
        context key, or None if it cannot be resolved to a single
        project.
        """
        context = self.env.context
        project_project_model = self.env["project.project"]
        if type(context.get("default_project_id")) in (int, int):
            return context["default_project_id"]
        if isinstance(context.get("default_project_id"), str):
            project_name = context["default_project_id"]
            project_ids = project_project_model.with_context(**context)
            project_ids = project_ids.name_search(project_name, operator="=")
            if not project_ids:
                project_ids = project_ids.name_search(
                    project_name,
                    operator="=ilike",
                )
            if not project_ids:
                project_ids.name_search(name=project_name)
            if len(project_ids) == 1:
                return project_ids[0][0]
        return None

    @api.model
    def _read_group_sprint_id(self, present_ids, domain, **kwargs):
        project_id = self._resolve_project_id_from_context()
        sprints = (
            self.env["project.scrum.sprint"]
            .search([("project_id", "=", project_id)], order="sequence")
            .name_get()
        )
        return sprints, None
