# Copyright 2018 Therp BV <http://therp.nl>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
import logging
from odoo.tests.common import TransactionCase
from odoo import fields, models, SUPERUSER_ID
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class TestProjectScrum(TransactionCase):

    post_install = True

    def setUp(self):
        super().setUp()
        self.project_project_obj = self.env['project.project']
        self.project_scrum_actors_obj = self.env['project.scrum.actors']
        self.project_scrum_meeting_obj = self.env['project.scrum.meeting']
        self.project_scrum_sprint_obj = self.env['project.scrum.sprint']
        self.project_scrum_test_obj = self.env['project.scrum.test']
        self.project_scrum_us_obj = self.env['project.scrum.us']
        self.project_task_obj = self.env['project.task']

    def test_crud_operations(self):
        _logger.debug('Testing CRUD operations on the models of project_scrum')
        self._test_create()
        self._test_get_formview_id()
        self._test_read()
        self._test_assertions()
        self._test_write()
        self._test_unlink()

    def _test_create(self):
        _logger.debug('Testing create operations')
        self.project_project_vals = {
            'name': 'test',
            'use_scrum': True,
            'default_sprintduration': 20,
            'manhours': 17,
            'alias_name': 'project',
            'privacy_visibility': 'followers',
            'description': '<p>Description</p>',
        }
        self.project_project = self.project_project_obj.create(
            self.project_project_vals,
        )
        self.project_scrum_actors_vals = {'name': 'Actor'}
        self.project_scrum_actors = self.project_scrum_actors_obj.create(
            self.project_scrum_actors_vals,
        )
        self.project_scrum_meeting_vals = {
            'project_id': self.project_project.id,
            'datetime_meeting': fields.Datetime.now(),
            'user_id_meeting': SUPERUSER_ID,
            'question_yesterday': '<p>Question1?</p>',
            'question_today': '<p>Question2?</p>',
            'question_blocks': '<p>Question3?</p>',
            'question_backlog': 'no',
        }
        self.project_scrum_meeting = self.project_scrum_meeting_obj.create(
            self.project_scrum_meeting_vals,
        )
        self.project_scrum_sprint_vals = {
            'name': 'Name',
            'user_id': SUPERUSER_ID,
            'date_start': fields.Date.today(),
            'date_stop': fields.Date.today(),
            'description': 'Description',
            'project_id': self.project_project.id,
            'product_owner_id': SUPERUSER_ID,
            'scrum_master_id': SUPERUSER_ID,
            'review': '<p>Review</p>',
            'retrospective': '<p>Retrospective</p>',
            'sequence': 123,
            'planned_hours': 14,
            'state': 'open',
        }
        self.project_scrum_sprint = self.project_scrum_sprint_obj.create(
            self.project_scrum_sprint_vals,
        )
        self.project_scrum_test_vals = {
            'name': 'Name',
            'project_id': self.project_project.id,
        }
        self.project_scrum_test = self.project_scrum_test_obj.create(
            self.project_scrum_test_vals,
        )
        self.project_scrum_us_vals = {
            'name': 'Scrum us',
            'description': '<p>Description</p>',
            'project_id': self.project_project.id,
            'sequence': 123,
            'moscow': self.project_scrum_us_obj._get_moscow_field()[-1][0],
            'value': self.project_scrum_us_obj._get_value_field()[-1][0],
            'risk': self.project_scrum_us_obj._get_risk_field()[-1][0],
            'kano': self.project_scrum_us_obj._get_kano_field()[-1][0],
            'reference': 'Reference',
            'kanban_state': 'done',
        }
        self.project_scrum_us = self.project_scrum_us_obj.create(
            self.project_scrum_us_vals,
        )
        self.project_task_vals = {
            'name': 'A Task',
            'user_id': SUPERUSER_ID,
            'sprint_id': self.project_scrum_sprint.id,
            'date_start': fields.Datetime.now(),
            'description': '<p>Description</p>',
            'moscow': self.project_scrum_us_obj._get_moscow_field()[-1][0],
            'value': self.project_scrum_us_obj._get_value_field()[-1][0],
            'risk': self.project_scrum_us_obj._get_risk_field()[-1][0],
            'kano': self.project_scrum_us_obj._get_kano_field()[-1][0],
        }
        self.project_task = self.project_task_obj.create(
            self.project_task_vals,
        )

    def _test_get_formview_id(self):
        self.project_task.write({'project_id': self.project_project.id})
        self.assertEquals(
            self.project_task.get_formview_id(),
            self.env.ref('project_scrum.view_ps_sprint_task_form2').id)
        self.project_project.write({'use_scrum': False})
        self.assertNotEqual(
            self.project_task.get_formview_id(),
            self.env.ref('project_scrum.view_ps_sprint_task_form2').id)
        # reset data as before testing function
        self.project_project.write({'use_scrum': True})
        with self.assertRaises(UserError):
            self.project_task.write({'project_id': False})

    def _test_read(self):
        _logger.debug('Testing read')
        for key in self.project_project_vals.keys():
            attr = getattr(self.project_project, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_project_vals[key],
            )
        for key in self.project_scrum_actors_vals.keys():
            attr = getattr(self.project_scrum_actors, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_scrum_actors_vals[key],
            )
        for key in filter(
                lambda x: x not in ['message_follower_ids', 'name'],
                self.project_scrum_meeting_vals.keys()):
            attr = getattr(self.project_scrum_meeting, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_scrum_meeting_vals[key],
            )
        for key in self.project_scrum_sprint_vals.keys():
            attr = getattr(self.project_scrum_sprint, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_scrum_sprint_vals[key],
            )
        for key in self.project_scrum_test_vals.keys():
            attr = getattr(self.project_scrum_sprint, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_scrum_test_vals[key],
            )
        for key in filter(
                lambda x: x not in ['message_follower_ids'],
                self.project_scrum_us_vals.keys()):
            attr = getattr(self.project_scrum_us, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_scrum_us_vals[key],
            )
        for key in filter(
                lambda x: x not in ['message_follower_ids', 'code'],
                self.project_task_vals.keys()):
            attr = getattr(self.project_task, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEquals(
                attr,
                self.project_task_vals[key],
            )

    def _test_assertions(self):
        _logger.debug('Testing assertions')
        self.assertEquals(
            self.project_scrum_meeting.name_get()[0][1],
            '%s - %s - %s' %
            (self.project_scrum_meeting.project_id.name,
                self.project_scrum_meeting.user_id_meeting.name,
                self.project_scrum_meeting.datetime_meeting))
        self.assertEquals(self.project_scrum_sprint.task_count, 1)
        self.assertEquals(self.project_project.sprint_count, 1)
        self.assertEquals(self.project_project.user_story_count, 1)
        self.assertEquals(self.project_project.meeting_count, 1)
        self.assertEquals(self.project_project.test_case_count, 1)

    def _test_write(self):
        _logger.debug('Testing write')
        self.project_project.write(self.project_project_vals)
        self.project_scrum_actors.write(self.project_scrum_actors_vals)
        del self.project_scrum_meeting_vals['message_follower_ids']
        self.project_scrum_meeting.with_context(
            {'tracking_disable': True}).write(
            self.project_scrum_meeting_vals)
        self.project_scrum_sprint.write(self.project_scrum_sprint_vals)
        self.project_scrum_test.write(self.project_scrum_test_vals)
        del self.project_scrum_us_vals['message_follower_ids']
        self.project_scrum_us.write(self.project_scrum_us_vals)
        del self.project_task_vals['message_follower_ids']
        self.project_task.write(self.project_task_vals)

    def _test_unlink(self):
        _logger.debug('Testing unlinks')
        self.assertEquals(self.project_scrum_actors.unlink(), True)
        self.assertEquals(self.project_scrum_meeting.unlink(), True)
        self.assertEquals(self.project_scrum_sprint.unlink(), True)
        self.assertEquals(self.project_scrum_test.unlink(), True)
        self.assertEquals(self.project_scrum_us.unlink(), True)
        self.assertEquals(self.project_task.unlink(), True)
        self.assertEquals(self.project_project.unlink(), True)
