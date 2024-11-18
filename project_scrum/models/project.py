from odoo import _, fields, models


class ProjectProject(models.Model):
    _inherit = "project.project"

    sprint_ids = fields.One2many(
        comodel_name="project.sprint",
        inverse_name="project_id",
        string="Sprints",
    )
    sprint_count = fields.Integer(compute="_compute_sprint_count")
    backlog_count = fields.Integer(compute="_compute_backlog_count")

    def _compute_backlog_count(self):
        for project in self:
            project.backlog_count = len(
                project.task_ids.filtered(
                    lambda task: not task.sprint_id and task.kanban_state != "done"
                )
            )

    def _compute_sprint_count(self):
        unassigned_sprint_count = self.env["project.sprint"].search(
            [("project_id", "=", False)], count=True
        )
        for project in self:
            project.sprint_count = len(project.sprint_ids) + unassigned_sprint_count

    def action_sprints(self):
        self.ensure_one()
        return {
            "name": _("Sprints"),
            "type": "ir.actions.act_window",
            "res_model": "project.sprint",
            "view_mode": "tree,form,timeline",
            "domain": ["|", ("project_id", "=", self.id), ("project_id", "=", False)],
            "context": {"default_project_id": self.id},
        }

    def action_backlog(self):
        self.ensure_one()
        return {
            "name": _("Backlog"),
            "type": "ir.actions.act_window",
            "res_model": "project.task",
            "view_mode": "tree,form",
            "domain": [
                ("project_id", "=", self.id),
                ("sprint_id", "=", False),
                ("kanban_state", "!=", "done"),
            ],
            "context": {"default_project_id": self.id},
        }

    def action_sprint_timeline(self):
        self.ensure_one()
        return {
            "name": _("Sprint Timeline"),
            "type": "ir.actions.act_window",
            "res_model": "project.task",
            "view_mode": "timeline",
            "domain": [("project_id", "=", self.id), ("sprint_id", "!=", False)],
            "context": {"default_project_id": self.id, "no_create": True},
        }
