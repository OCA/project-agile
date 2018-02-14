# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import logging
from odoo import models, fields, api
from contextlib import contextmanager

_logger = logging.getLogger(__name__)

REQUEST_STATES = [
    ("draft","Draft"),
    ("confirmed","Confirmed"),
    ("processing", "Processing"),
    ("processed", "Processed"),
    ("error", "Error"),
]

JOB_TYPE = [
    ("prepare_issues_import", "Prepare issues for import"),
    ("import_issue", "Import issue"),
    ("add_relation", "Add Relation"),
    ("add_link", "Add Link"),
    ("add_worklog", "Add Worklog"),
]


class JiraRequest(models.Model):
    _name = "project.agile.jira.request"

    state = fields.Selection(
        selection=REQUEST_STATES,
        string="State",
        required=True,
        default="confirmed"
    )

    name = fields.Char(
        string="Name",
        required=True,
        copy=False,
        default=lambda self: self.env["ir.sequence"].next_by_code("project.agile.jira.request.job")
    )

    attempt = fields.Integer(
        string="Import attempt",
        default=1
    )

    log_ids = fields.One2many(
        comodel_name="project.agile.jira.request.log",
        inverse_name="request_id",
        string="Logs"
    )

    config_id = fields.Many2one(
        comodel_name="project.agile.jira.config",
        string="Config",
        ondelete="cascade"
    )

    project_id = fields.Many2one(
        comodel_name="project.project",
        string="Project"
    )

    job_type = fields.Selection(
        selection=JOB_TYPE,
        string="Job type"
    )

    args = fields.Text(
        string="args"
    )

    kwargs = fields.Text(
        string="kwargs"
    )

    @contextmanager
    def session(self):
        with api.Environment.manage():
            new_cr = self.pool.cursor()
            try:
                yield new_cr
                new_cr.commit()
            except:
                _logger.info("Failed to write to database!")
                new_cr.rollback()
            finally:
                new_cr.close()

    @api.one
    def create_task(self, data):
        with self.session() as new_cr:
            self.with_env(self.env(cr=new_cr)).env["project.task"].create(data)


    @api.one
    def write_dict(self, vals):
        with self.session() as new_cr:
            self.with_env(self.env(cr=new_cr)).write(vals)

    @api.multi
    def requeue_request(self):
        self.ensure_one()
        self.write_dict({"state": "confirmed", "attempt": self.attempt + 1})

    @api.one
    def _create_log(self, message, stack_trace=None, log_type="error"):
        """Create requestion log in a separate db connection."""
        vals = {
            "log_type": log_type,
            "attempt": self.attempt,
            "message": message,
            "stack_trace": stack_trace,
            "request_id": self.id
        }
        with self.session() as new_cr:
            self.with_env(self.env(cr=new_cr)).env["project.agile.jira.request.log"].create(vals)


LOG_TYPES = [
    ("warning","Warning"),
    ("error","Error"),
]


class JiraRequestLog(models.Model):
    _name = "project.agile.jira.request.log"

    _rec_name = "log_type"
    _order = "attempt desc, log_type"

    request_id = fields.Many2one(
        comodel_name="project.agile.jira.request",
        string="Request",
        ondelete="cascade"
    )

    log_type = fields.Selection(
        selection=LOG_TYPES,
        string="Type",
        default="error"
    )

    attempt = fields.Integer(
        string="Attempt"
    )

    message = fields.Text(
        string="Message"
    )

    stack_trace = fields.Text(
        string="Stack Trace"
    )


