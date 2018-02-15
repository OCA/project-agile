# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import logging

from odoo import models, fields, api, exceptions, _

_logger = logging.getLogger(__name__)

try:
    import jira
except (ImportError, IOError) as err:
    _logger.debug(err)


class TaskImport(models.TransientModel):
    _name = "project.agile.jira.task.import.wizard"

    project_id = fields.Many2one(
        comodel_name="project.project",
        string="Project",
        required=True,
    )

    issue_type_mapper_ids = fields.One2many(
        comodel_name="project.agile.jira.issue.type.mapper",
        string="Type mapper",
        inverse_name="task_import_id"
    )

    @api.onchange("project_id")
    def change_issue_types(self):
        if not self.project_id:
            return

        jira_config = self.env[self.env.context.get("active_model")].browse(
            self.env.context.get("active_id")
        )
        client = jira.JIRA(
            server=jira_config.location,
            basic_auth=(jira_config.username, jira_config.password)
        )

        jira_project = client.project(self.project_id.key)

        issue_types = []
        for issue_type in jira_project.issueTypes:
            issue_types.append((0, 0, {"issue_type": issue_type.name}))

        self.issue_type_mapper_ids = issue_types

    @api.multi
    def button_import(self):

        if self.project_id.task_ids:
            raise exceptions.Warning(_(
                "Project %s has tasks... Possible problem with task KEY"
            ) % self.project_id.name)

        if not self.project_id.workflow_id:
            raise exceptions.ValidationError(_(
                "Project %s must have workflow defined!"
            ) % self.project_id.name)

        mapper = dict()

        for issue_type_mapper in self.issue_type_mapper_ids:
            mapper.update({
                issue_type_mapper.issue_type: issue_type_mapper.task_type_id.id
            })

        jira_config = self.env[self.env.context.get("active_model")].browse(
            self.env.context.get("active_id")
        )

        jira_config.write({
            "request_ids": [(0, 0, {
                "project_id": self.project_id.id,
                "kwargs": mapper,
                "job_type": "prepare_issues_import"
            })]
        })

        return {
            "type": "ir.actions.act_window_close"
        }


class IssueTypeMapper(models.TransientModel):
    _name = "project.agile.jira.issue.type.mapper"

    task_import_id = fields.Many2one(
        comodel_name="project.agile.jira.task.import.wizard",
        string="Task Importer"
    )

    issue_type = fields.Char(
        string="Issue Type"
    )

    task_type_id = fields.Many2one(
        comodel_name="project.task.type2",
        string="Task Type"
    )
