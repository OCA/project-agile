# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import _
from odoo.http import request
from odoo.osv.expression import OR
from odoo.addons.project_portal.controllers.portal import CustomerPortal


class CustomerPortal(CustomerPortal):

    def portal_my_tasks_prepare_searchbar(self):
        searchbar = super(CustomerPortal, self).portal_my_tasks_prepare_searchbar()

        searchbar['sorting'].update({
            'type': {'label': _('Type'), 'order': 'type_id'},
            'priority': {'label': _('Priority'), 'order': 'priority_id'},
        })

        return searchbar

    def portal_my_tasks_prepare_task_search_domain(self, search_in, search):
        domain = super(CustomerPortal, self).portal_my_tasks_prepare_task_search_domain(search_in, search)
        if search and search_in:
            if search_in in ('content', 'all'):
                domain = OR([domain, ['|', ('type_id', 'ilike', search), ('priority_id', 'ilike', search)]])
        return domain

    def portal_my_tasks_prepare_values(self,
                                       page=1, date_begin=None, date_end=None, sortby=None, filterby=None, search=None,
                                       search_in='content', **kw):
        values = super(CustomerPortal, self).portal_my_tasks_prepare_values(
            page, date_begin, date_end, sortby, filterby, search, search_in, **kw
        )
        values["priorities"] = request.env["project.task.priority"].sudo().search([])
        values["types"] = request.env["project.task.type2"].sudo().search([])
        return values

    def portal_my_task_prepare_values(self, task_id=None, **kw):
        values = super(CustomerPortal, self).portal_my_task_prepare_values(task_id, **kw)
        values["types"] = request.env["project.task.type2"].sudo().search([])
        values["priorities"] = request.env["project.task.priority"].sudo().search([])
        return values
