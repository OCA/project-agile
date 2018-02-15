# Copyright 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import _
from odoo.osv.expression import OR
from odoo.addons.project_portal.controllers.portal import CustomerPortal


class CustomerPortal(CustomerPortal):

    def portal_my_tasks_prepare_task_search_domain(self, search_in, search):
        domain = super(CustomerPortal, self)\
            .portal_my_tasks_prepare_task_search_domain(search_in, search)

        if search and search_in:
            if search_in in ('content', 'all'):
                domain = OR([domain, [('key', 'ilike', search)]])
        return domain

    def portal_my_tasks_prepare_searchbar(self):
        searchbar = super(CustomerPortal, self)\
            .portal_my_tasks_prepare_searchbar()

        searchbar['sorting'].update({
            'key': {'label': _('Key'), 'order': 'key'},
        })

        return searchbar
