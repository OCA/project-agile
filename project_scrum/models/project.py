from odoo import fields, models


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
        backlogs_count_by_sprint = dict(
            self.env["project.task"]._read_group(
                [
                    ("project_id", "in", self.ids),
                    ("sprint_id", "=", False),
                    ("state", "!=", "1_done"),
                ],
                ["project_id"],
                ["__count"],
            )
        )
        for project in self:
            project.backlog_count = backlogs_count_by_sprint.get(project, 0)

    def _compute_sprint_count(self):
        assigned_sprint_count = dict(
            self.env["project.sprint"]._read_group(
                [("project_id", "in", self.ids)], ["project_id"], ["__count"]
            )
        )
        unassigned_sprint_count = self.env["project.sprint"].search_count(
            [("project_id", "=", False)]
        )
        for project in self:
            project.sprint_count = (
                assigned_sprint_count.get(project, 0) + unassigned_sprint_count
            )

    def action_sprints(self):
        self.ensure_one()
        return {
            "name": self.env._("Sprints"),
            "type": "ir.actions.act_window",
            "res_model": "project.sprint",
            "view_mode": "list,form,timeline",
            "domain": ["|", ("project_id", "=", self.id), ("project_id", "=", False)],
            "context": {"default_project_id": self.id},
        }

    def action_backlog(self):
        self.ensure_one()
        return {
            "name": self.env._("Backlog"),
            "type": "ir.actions.act_window",
            "res_model": "project.task",
            "view_mode": "list,form",
            "domain": [
                ("project_id", "=", self.id),
                ("sprint_id", "=", False),
                ("state", "!=", "1_done"),
            ],
            "context": {"default_project_id": self.id},
        }

    def action_sprint_timeline(self):
        self.ensure_one()
        return {
            "name": self.env._("Sprint Timeline"),
            "type": "ir.actions.act_window",
            "res_model": "project.task",
            "view_mode": "timeline",
            "domain": [("project_id", "=", self.id), ("sprint_id", "!=", False)],
            "context": {"default_project_id": self.id, "no_create": True},
        }
