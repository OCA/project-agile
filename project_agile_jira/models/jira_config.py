# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import logging

from odoo import models, fields, api

_logger = logging.getLogger(__name__)

try:
    import jira
except (ImportError, IOError) as err:
    _logger.debug(err)


class JiraConfig(models.Model):
    _name = "project.agile.jira.config"

    name = fields.Char(
        string="Name",
        help="Config Name"
    )

    location = fields.Char(
        string="Location",
        required=True,
        help="Url to jira application"
    )

    username = fields.Char(
        string="Username",
        help="Webservice user"
    )

    password = fields.Char(
        string="Password",
        help="Webservice password"
    )

    request_ids = fields.One2many(
        comodel_name="project.agile.jira.request",
        inverse_name="config_id",
        string="Requests"
    )

    @api.multi
    def synchronize_projects(self):
        for server in self:
            client = jira.JIRA(
                server=server.location,
                basic_auth=(server.username, server.password)
            )

            for simple_project in client.projects():
                project_data = client.project(simple_project.id).raw

                project_type = self.env["project.type"].search([
                    ("name", "ilike", project_data["projectTypeKey"])
                ], limit=1)

                if not project_type:
                    task_types = []
                    for issue_type in project_data["issueTypes"]:
                        task_type = self.env["project.task.type2"].search([
                            ("description", "=", issue_type["name"])
                        ])

                        if not task_type:
                            task_type = self.env["project.task.type2"].create({
                                "description": issue_type["name"]
                            })
                        task_types.append(task_type.id)

                    project_type = self.env["project.type"].create({
                        "name": project_data["projectTypeKey"],
                        "task_type_ids": [(6, 0, task_types)]
                    })

                project_manager = self.env["res.users"].search([
                    ("name", "ilike", project_data["lead"]["displayName"])
                ], limit=1)

                project = self.env["project.project"].search([
                    ("key", "=", project_data["key"])
                ], limit=1)

                new_data = {
                    "name": project_data["name"],
                    "key": project_data["key"],
                    "user_id": project_manager and project_manager.id or False,
                    "type_id": project_type.id,
                }

                if project:
                    project.write(new_data)
                else:
                    self.env["project.project"].create(new_data)
