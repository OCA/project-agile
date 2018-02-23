# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import werkzeug
import logging
import json

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class LiraController(http.Controller):

    @http.route('/lira/web', type='http', auth='user')
    def index(self, debug=False, **k):
        context = {
            'session_info': json.dumps(request.env['ir.http'].session_info())
        }

        return request.render('lira.index', qcontext=context)

    @http.route([
        '/lira/web/data/task/create_link'
    ], type='json', auth='user')
    def create_link(self, link):
        link = request.env()['project.task.link'].create(link)
        return self.prepare_task_link(link)

    @http.route([
        '/lira/web/data/task/<model("project.task"):task>/add_comment'
    ], type='json', auth='user')
    def add_comment(self, task, comment):
        if comment['log_message']:
            subtype = "mail.mt_comment"
        else:
            subtype = "mail.mt_note"
        new_message = task.message_post(
            body=comment['body'], message_type='comment', subtype=subtype,
            attachment_ids=comment.get("attachment_ids", [])
        )
        return new_message.with_context(lira=True).message_format()[0]

    @http.route([
        '/lira/web/data/task/<model("project.task"):task>/update_comment/'
        '<model("mail.message"):message>'
    ], type='json', auth='user')
    def edit_comment(self, task, message, comment):
        if "log_message" in comment:
            if comment['log_message']:
                comment['subtype_id'] = request.env.ref('mail.mt_comment').id
            else:
                comment['subtype_id'] = request.env.ref('mail.mt_note').id
            del comment['log_message']
        if "attachment_ids" in comment:
            if isinstance(comment["attachment_ids"], list):
                attachment_ids = message.attachment_ids.ids + \
                                 comment['attachment_ids']
                comment["attachment_ids"] = [(6, 0, attachment_ids)]
            else:
                del comment['attachment_ids']
        message.write(comment)
        return message.with_context(lira=True).message_format()[0]

    @http.route([
        '/lira/web/data/workflow/<model("project.workflow"):workflow>'
    ], type='json', auth='user')
    def get_workflow(self, workflow):
        return self.prepare_workflow(workflow)

    @http.route([
        '/lira/web/data/task/<model("project.task"):task>'
        '/confirm_stage_change'
    ], type='json', auth='user')
    def confirm_task_stage_change(self, task, values, message=None,
            log_message=False):

        task.write(values)
        subtype = "mail.mt_comment" if log_message else "mail.mt_note"
        msg = False
        if message:
            msg = task.message_post(
                body=message,
                message_type='comment',
                subtype=subtype
            )

        return msg and msg.with_context(
            lira=True
        ).message_format()[0] or False

    @http.route([
        '/lira/web/data/task/<model("project.task"):task>/get_task_links',
    ], type='json', auth='user')
    def get_task_links(self, task):
        return [self.prepare_task_link(link) for link in task.link_ids]

    @http.route([
        '/lira/web/data/project/<model("project.project"):project>'
        '/task_types_and_priorities',
    ], type='json', auth='user')
    def task_types_and_priorities(self, project):
        result = {
            'types': {},
            'priorities': {},
        }

        # Recursively prepare all project types and subtypes
        def collect_task_types(type):
            if type.id in result['types']:
                return

            result['types'][type.id] = self.prepare_task_type(type)
            for subtype in type.type_ids:
                collect_task_types(subtype)

        for type in project.type_id.task_type_ids:
            collect_task_types(type)

            for priority in type.priority_ids:
                result['priorities'][priority.id] = \
                    self.prepare_task_priority(priority)

        # Keep track of task types that belong directly to project
        result["project_types"] = project.type_id.task_type_ids.ids
        return result

    def prepare_task_link(self, link):
        result = {
            "id": link.id,
            # "task_id": link.task_id,
            "related_task": self.prepare_task(link.related_task_id),
            "relation_name": link.relation_name
        }
        user_id = link.related_task_id.user_id
        result["related_task"]["user_id"] = \
            user_id and [user_id.id, user_id.name] or False
        return result

    def prepare_task_type(self, type):
        return {
            'id': type.id,
            'name': type.name,
            'allow_sub_tasks': type.allow_sub_tasks,
            'type_ids': type.type_ids.ids,
            'lira_icon': type.lira_icon,
            'lira_icon_color': type.lira_icon_color,
            'priority_ids': [p.id for p in type.priority_ids],
            'default_priority_id': type.default_priority_id.id,
            'allow_story_points': type.allow_story_points,
        }

    def prepare_task_priority(self, priority):
        return {
            'id': priority.id,
            'name': priority.name,
            'lira_icon': priority.lira_icon,
            'lira_icon_color': priority.lira_icon_color,
        }

    def prepare_board(self, board):
        return {
            'id': board.id,
            'name': board.name,
        }

    def prepare_task(self, task):
        return {
            'id': task.id,
            'name': task.name,
            'key': task.key,
            'description': task.description,
            'agile_order': task.agile_order,
            'type_lira_icon': task.type_lira_icon,
            'type_lira_icon_color': task.type_lira_icon_color,
            'priority_lira_icon': task.priority_lira_icon,
            'priority_lira_icon_color': task.priority_lira_icon_color,
            'story_points': task.story_points or 0,
            'project_id': [task.project_id.id, task.project_id.name],
            'stage_id': task.stage_id.id,
            'stage_name': task.stage_name,
            'type_id': [task.type_id.id, task.type_id.name],
            'priority_id': [task.priority_id.id, task.priority_id.name],
            'user_id': task.user_id.id,
            'parent_id': task.parent_id.id,
            'parent_key': task.parent_key,
            'child_ids': [t.id for t in task.child_ids],
            'is_user_story': task.is_user_story,
            'wkf_state_type': task.wkf_state_type,
        }

    def prepare_user(self, user):
        return {
            'id': user.id,
            'name': user.name,
        }

    def prepare_state(self, state):
        return {
            'id': state.id,
            'name': state.name,
            'stage_id': state.stage_id.id,
            'global_in': state.is_global,
            'global_out': state.is_global,
            'type': state.type,
            'workflow_id': state.workflow_id.id,
            'in_transitions': [x['id'] for x in state.in_transitions],
            'out_transitions': [x['id'] for x in state.out_transitions],
        }

    def prepare_transition(self, transition):
        return {
            'id': transition.id,
            'name': transition.name,
            'description': transition.description,
            'src': transition.src_id.id,
            'dst': transition.dst_id.id,
            'workflow_id': transition.workflow_id.id,
            'user_confirmation': transition.user_confirmation,
        }

    def prepare_workflow(self, workflow):
        wkf = {
            'workflows': {
                'id': workflow.id,
                'name': workflow.name,
                'description': workflow.description
            },
            'states': {},
            'transitions': {},
        }
        for state in workflow.state_ids:
            wkf['states'][state.id] = self.prepare_state(state)

        for transition in workflow.transition_ids:
            wkf['transitions'][transition['id']] = self.prepare_transition(
                transition
            )
        return wkf

    def prepare_board_workflow(self, board):
        wkf = {
            'workflows': [{
                'id': workflow.id,
                'name': workflow.name,
                'description': workflow.description
            } for workflow in board.workflow_ids],
            'states': {},
            'transitions': {},
        }
        for workflow in board.workflow_ids:
            for state in workflow.state_ids:
                wkf['states'][state.id] = self.prepare_state(state)

        for workflow in board.workflow_ids:
            for transition in workflow.transition_ids:
                wkf['transitions'][transition['id']] = self.prepare_transition(
                    transition
                )
        return wkf

    def prepare_project(self, project):
        return {
            'id': project.id,
            'name': project.name,
            'workflow_id': project.workflow_id.id,
        }

    def prepare_column(self, column):
        return {
            'id': column.id,
            'name': column.name,
            'order': column.order,
        }

    def prepare_status(self, status, column):
        return {
            'id': status.id,
            'state_id': status.state_id.id,
            'order': status.order,
            'column_id': column.id,
        }

    @http.route('/lira/messages', type='json', auth='user')
    def load_messages(self, model, res_id, message_type=None,
            message_subtype=None, **kwargs):
        def operator(value):
            return isinstance(value, (list,)) and 'in' or '='

        domain = [("model", "=", model), ("res_id", "=", res_id)]

        if message_type:
            domain.append(
                ('message_type', operator(message_type), message_type)
            )

        if message_subtype:
            domain.append(
                ('subtype_id', operator(message_subtype), message_type)
            )

        fields = kwargs.get('fields', [])
        offset = kwargs.get('offset', 0)
        limit = kwargs.get('limit', None)
        order = kwargs.get('order', None)

        return request.env["mail.message"].search(
            domain, fields, offset, limit, order
        ).with_context(lira=True).message_format()

    @http.route('/lira/activity-stream', type='json', auth='user')
    def activity_stream(self, **k):
        if not request.env.user.team_id:
            return []
        if "task_ids" in k:
            task_ids = k["task_ids"]
        else:
            task_ids = request.env['project.task'].search([
                ('project_id', 'in', request.env.user.team_id.project_ids.ids)
            ]).ids

        domain = [
            ('model', '=', 'project.task'),
            ('res_id', 'in', task_ids),
            '|',
            ('message_type', '=', 'comment'),
            ('subtype_id', 'in', k['subtype_ids'])
        ]

        return request.env['mail.message'].search(
            domain, limit=k.get('limit', False)
        ).with_context(lira=True).message_format()

    @http.route('/lira/session_user', type='json', auth='user')
    def session_user(self):
        user = request.env.user
        team_id = user.team_id
        Board = request.env["project.agile.board"]
        available_board_ids = Board.search([
            '|',
            ('visibility', '=', 'global'),
            '|',
            '&', ('visibility', '=', 'team'),
            ('team_id', 'in', user.team_ids.ids),
            '&', ('visibility', '=', 'user'),
            ('user_id', '=', user.id)
        ])
        return {
            "id": user.id,
            "write_date": user.write_date,
            "name": user.name,
            "groups_id": user.groups_id.ids,
            "team_ids": self.prepare_user_teams(user.team_ids),
            "team_id": team_id and [team_id.id, team_id.name] or False,
            "board_ids": available_board_ids.ids,
            "partner_id": [user.partner_id.id, user.partner_id.name],
        }

    def prepare_user_teams(self, team_ids):
        result = {}
        for team in team_ids:
            result[team.id] = self.prepare_user_team(team)
        return result

    def prepare_user_team(self, team):
        return {
            "id": team.id,
            "name": team.name,
            "project_ids": team.project_ids.ids,
        }

    @http.route('/lira/model/info', type='json', auth='user')
    def lira_model_info(self, model_name):
        model_obj = request.env[model_name]

        result = {
            'name': model_name,
            'sync': getattr(model_obj, "_implements_syncer", False),
            'fields': {}
        }

        for field_name in model_obj._fields:
            field = model_obj._fields[field_name]

            if not field._attrs.get("lira", False):
                continue

            inverse_name = False
            if field.type == 'one2many':
                inverse_name = field.inverse_name

            result['fields'][field.name] = {
                'name': field.name,
                'type': field.type,
                'comodel_name': field.comodel_name,
                'inverse_name': inverse_name,
                'string': field.string,
                'help': field.help,
                'required': field.required,
                'readonly': field.readonly,
            }

        return result

    def get_task_url(self, key):
        env = request.env()

        Task = env['project.task']
        tasks = Task.search([('key', '=ilike', key)])

        task_url = "lira/web?#page=board&project=%s&task=%s&view=task" % \
                   (tasks and tasks.project_id.id or -1,
                    tasks and tasks.id or -1)
        return task_url

    def get_project_url(self, key):
        env = request.env()

        Project = env['project.project']
        projects = Project.search([('key', '=ilike', key)])
        if not projects.exists():
            return False

        project_url = "lira/web?#page=board&project=%s&view=%s" % (
            projects and projects.id or -1,
            projects and projects.agile_method or ''
        )

        return project_url

    @http.route('/lira/browse/<string:key>', type='http', auth="user")
    def browse(self, key, **kwargs):
        redirect_url = self.get_project_url(key)
        if not redirect_url:
            redirect_url = self.get_task_url(key)
        return werkzeug.utils.redirect(redirect_url or '', 301)
