# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import logging
import traceback
import ast
import re

from contextlib import contextmanager

from odoo import models, api


_logger = logging.getLogger(__name__)

try:
    import jira
except (ImportError, IOError) as err:
    _logger.debug(err)


class JiraWorker(models.AbstractModel):
    _name = "project.agile.jira.worker"

    @contextmanager
    def session(self):
        with api.Environment.manage():
            new_cr = self.pool.cursor()
            try:
                yield new_cr
                new_cr.commit()
            except Exception as ex:
                _logger.info("Failed to write to database!: %s", str(ex))
                new_cr.rollback()
            finally:
                new_cr.close()

    @api.model
    def execute_requests(self):
        requests = self.env["project.agile.jira.request"].search([
            ("state", "=", "confirmed")
        ])

        for request in requests:
            request.write_dict({"state": "processing"})
            with self.session() as new_cr:
                transaction = self.with_env(self.env(cr=new_cr))
                try:
                    if request.job_type == "prepare_issues_import":
                        transaction.prepare_issuses_import(request)
                    elif request.job_type == "import_issue":
                        transaction.import_issue(request)
                    elif request.job_type == "add_relation":
                        transaction.add_relation(request)
                    elif request.job_type == "add_link":
                        transaction.add_link(request)
                    elif request.job_type == "add_worklog":
                        transaction.add_worklog(request)
                    else:
                        pass
                except BaseException as ex:
                    error_message = str(ex)
                    stack_trace = traceback.format_exc()
                    request._create_log(error_message, stack_trace=stack_trace)
                    request.write_dict({"state": "error"})
                else:
                    request.write_dict({"state": "processed"})

    def prepare_issuses_import(self, request):

        max_issue_number = -1

        # (parent, child)
        relationships = list()
        links = list()
        worklogs = list()

        args = list()
        if request.args:
            args = ast.literal_eval(request.args)

        kwargs = dict()
        if request.kwargs:
            kwargs = ast.literal_eval(request.kwargs)

        def get_trailing_number(s):
            m = re.search(r'\d+$', s)
            return int(m.group()) if m else None

        def create_issue_import_job():

            for subtask in issue.fields.subtasks:
                relationships.append((issue.key, subtask.key))

            for link in issue.fields.issuelinks:
                if hasattr(link, 'outwardIssue'):
                    links.append(
                        (issue.key, link.outwardIssue.key, link.type.outward)
                    )

            for worklog in issue.fields.worklog.worklogs:
                worklogs.append({
                    "user": worklog.author.displayName,
                    "duration": worklog.timeSpentSeconds/3600,
                    "description": worklog.comment,
                    "issue": issue.key,
                })

            request.config_id.write({
                "request_ids": [(0, 0, {
                    "project_id": request.project_id.id,
                    "args": [issue.id] + args,
                    "kwargs": kwargs,
                    "job_type": "import_issue"
                })]
            })

            return get_trailing_number(issue.key)

        def create_add_relation_job():
            request.config_id.write({
                "request_ids": [(0, 0, {
                    "project_id": request.project_id.id,
                    "args": [relation] + args,
                    "kwargs": kwargs,
                    "job_type": "add_relation"
                })]
            })

        def create_add_link_job():
            request.config_id.write({
                "request_ids": [(0, 0, {
                    "project_id": request.project_id.id,
                    "args": [link] + args,
                    "kwargs": kwargs,
                    "job_type": "add_link"
                })]
            })

        def create_add_worklog_job():
            request.config_id.write({
                "request_ids": [(0, 0, {
                    "project_id": request.project_id.id,
                    "args": [worklog],
                    "kwargs":  {},
                    "job_type": "add_worklog"
                })]
            })

        client = jira.JIRA(
            server=request.config_id.location,
            basic_auth=(request.config_id.username, request.config_id.password)
        )

        issues = client.search_issues(
            "project=%s" % request.project_id.key,
            fields="subtasks, issuelinks, worklog"
        )

        for issue in issues:
            number = create_issue_import_job()
            if number > max_issue_number:
                max_issue_number = number

        for relation in relationships:
            create_add_relation_job()

        for link in links:
            create_add_link_job()

        for worklog in worklogs:
            create_add_worklog_job()

        request.project_id.write({"task_sequence": max_issue_number})

    def import_issue(self, request):

            args = list()
            kwargs = dict()

            if request.args:
                args = ast.literal_eval(request.args)

            if request.kwargs:
                kwargs = ast.literal_eval(request.kwargs)

            client = jira.JIRA(
                server=request.config_id.location,
                basic_auth=(
                    request.config_id.username, request.config_id.password
                )
            )

            issue = client.issue(args[0])

            data = {
                "project_id": request.project_id.id,
                "name": issue.raw["fields"]["summary"],
                "description": issue.raw["fields"]["description"],
                "user_id": False,
                "create_uid": False,
            }

            key = issue.raw["key"]

            if issue.raw["fields"]["priority"]:
                task_priority = self.env["project.task.priority"].search([
                    ("name", "ilike", issue.raw["fields"]["priority"]["name"])
                ])
                priority_id = task_priority and task_priority.id or False
                data["priority_id"] = priority_id

            if issue.raw["fields"]["assignee"]:
                name = issue.raw["fields"]["assignee"]["displayName"]
                assignee_id = self.env["res.users"].search([
                    ("name", "ilike", name)
                ])
                data["user_id"] = assignee_id and assignee_id.id or False

            if issue.raw["fields"]["reporter"]:
                name = issue.raw["fields"]["reporter"]["displayName"]
                reporter_id = self.env["res.users"].search([
                    ("name", "ilike", name)
                ])
                data["create_uid"] = reporter_id and reporter_id.id or False

            if issue.raw["fields"]["issuetype"]:
                type_id = kwargs[issue.raw["fields"]["issuetype"]["name"]]
                data["type_id"] = type_id

            task = self.env["project.task"].create(data)
            task.write({"key": key})

    def add_relation(self, request):
        args = list()

        if request.args:
            args = ast.literal_eval(request.args)

        for arg in args:
            parent_task = self.env["project.task"].search([
                ("key", "=", arg[0])
            ])
            task = self.env["project.task"].search([("key", "=", arg[1])])

            if parent_task and task:
                task.write({
                    "parent_id": task.id
                })

    def add_link(self, request):
        args = list()

        if request.args:
            args = ast.literal_eval(request.args)

        for arg in args:

            task = self.env["project.task"].search([("key", "=", arg[0])])
            related_task = self.env["project.task"].search([
                ("key", "=", arg[1])
            ])

            relation = self.env["project.task.link.relation"].search([
                ("name", "=", arg[2])
            ])

            if task and related_task and relation:
                self.env['project.task.link'].create({
                    "task_left_id": task.id,
                    "task_right_id": related_task.id,
                    "relation_id": relation.id,
                })

    def add_worklog(self, request):
        args = list()

        if request.args:
            args = ast.literal_eval(request.args)

        for arg in args:
            data = {
                "unit_amount": arg["duration"],
                "name": arg["description"],
                "account_id": request.project_id.analytic_account_id.id
            }

            user = self.env["res.users"].search([
                ("name", "ilike", arg["user"])
            ])
            data["user_id"] = user and user.id or False

            task = self.env["project.task"].search([
                ("key", "=", arg["issue"])
            ])

            task.write({
                "timesheet_ids": [(0, 0, data)]
            })
