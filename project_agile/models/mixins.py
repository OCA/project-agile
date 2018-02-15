# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import logging
from odoo import models, api

_logger = logging.getLogger(__name__)


class IdSearchMixin(models.AbstractModel):
    _name = 'project.agile.mixin.id_search'

    @api.model
    def id_search(self, name='', args=None, context=None, operator='ilike',
                  limit=100, order=None):
        """ Works exactly like name_search,
        except that returns only Array of ids, without names
        """
        if context:
            self = self.with_context(context=context)

        return self._id_search(name, args, operator, limit, order)

    @api.model
    def _id_search(self, name='', args=None, operator='ilike',
                   limit=100, order=None, name_get_uid=None):

        # private implementation of id_search, allows passing a dedicated user
        # for the name_get part to solve some access rights issues
        args = list(args or [])

        # Optimize out the default criterion of ``ilike ''``
        # that matches everything
        if not self._rec_name:
            _logger.warning(
                "Cannot execute name_search, no _rec_name defined on %s",
                self._name
            )

        elif not (name == '' and operator == 'ilike'):
            args += [(self._rec_name, operator, name)]

        return self.search(args, order=order).ids
