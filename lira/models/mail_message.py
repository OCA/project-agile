# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class MailMessageSubtype(models.Model):
    _name = 'mail.message.subtype'
    _inherit = ['mail.message.subtype', 'project.agile.mixin.id_search']

    name = fields.Char(lira=True)
    default = fields.Boolean(lira=True)
    sequence = fields.Integer(lira=True)


class Message(models.Model):
    _inherit = "mail.message"

    author_last_update = fields.Datetime(
        related='create_uid.__last_update',
        lira=True
    )

    @api.model
    def _message_read_dict_postprocess(self, messages, message_tree):
        ret = super(Message, self)._message_read_dict_postprocess(
            messages, message_tree
        )

        if self.env.context.get("lira", False):
            for message_dict in messages:
                message = message_tree[message_dict.get('id')]
                message_dict.update({
                    'author_last_update': message.author_last_update,
                    'write_date': message.write_date,
                })
        return ret
