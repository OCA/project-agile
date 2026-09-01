# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import api, fields, models


class ProjectTask(models.Model):
    _inherit = "project.task"
    _order = "sequence"

    def write(self, vals):
        sprints = self.mapped("sprint_id")
        result = super().write(vals)
        if "stage_id" in vals or "sprint_id" in vals:
            (sprints | self.mapped("sprint_id"))._check_auto_done()
        return result

    sprint_id = fields.Many2one(
        comodel_name="project.scrum.sprint",
        string="Sprint",
    )
    use_scrum = fields.Boolean(related="project_id.use_scrum", readonly=1)
    current_sprint = fields.Boolean(
        compute="_compute_current_sprint",
        search="_search_current_sprint",
    )
    user_id = fields.Many2one("res.users", string="User")

    @api.depends("sprint_id")
    def _compute_current_sprint(self):
        for rec in self:
            sprint = self.env["project.scrum.sprint"].get_current_sprint(
                rec.project_id.id
            )
            if sprint:
                rec.current_sprint = sprint.id == rec.sprint_id.id
            else:
                rec.current_sprint = False

    def _search_current_sprint(self, operator, value):
        project_id = self.env.context.get("default_project_id", None)
        sprint = self.env["project.scrum.sprint"].get_current_sprint(project_id)
        return [("sprint_id", "=", sprint and sprint.id or None)]

    def get_formview_id(self, access_uid=None):
        if all(self.mapped("use_scrum")):
            return self.env.ref("project_scrum.view_ps_sprint_task_form2").id
        return super().get_formview_id(access_uid)
